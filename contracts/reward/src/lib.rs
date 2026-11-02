#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, contracterror, token, Address, Env, symbol_short};

#[contracttype]
#[derive(Clone, PartialEq, Debug)]
pub enum MilestoneType {
    ModuleComplete,
    CourseComplete,
    AssessmentPassed,
    StreakBonus,
}

#[contracttype]
pub enum DataKey {
    Admin,
    TokenAddress,
    RewardAmount(MilestoneType),
    TotalDisbursed(Address),
    DailyDisbursed(Address, u64), // (learner, day)
    DailyCap,
}

#[contracterror]
#[derive(Debug, Copy, Clone, PartialEq)]
pub enum Error {
    NotInitialised = 1,
    DailyCapExceeded = 2,
    Unauthorised = 3,
}

const DEFAULT_DAILY_CAP: i128 = 100_0000000; // 100 LEARN (7 decimals)

pub fn milestone_default_amount(milestone: &MilestoneType) -> i128 {
    match milestone {
        MilestoneType::ModuleComplete => 1_0000000,   // 1 LEARN
        MilestoneType::CourseComplete => 10_0000000,  // 10 LEARN
        MilestoneType::AssessmentPassed => 2_0000000, // 2 LEARN
        MilestoneType::StreakBonus => 5_0000000,      // 5 LEARN
    }
}

#[contract]
pub struct RewardContract;

#[contractimpl]
impl RewardContract {
    /// Initialise the contract with admin and LEARN token address.
    pub fn initialise(env: Env, admin: Address, token: Address) {
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::TokenAddress, &token);
        env.storage().instance().set(&DataKey::DailyCap, &DEFAULT_DAILY_CAP);
    }

    /// Disburse LEARN tokens to a learner for completing a milestone.
    pub fn disburse_reward(
        env: Env,
        learner: Address,
        milestone: MilestoneType,
        amount: i128,
    ) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialised)?;
        admin.require_auth();

        let token_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenAddress)
            .ok_or(Error::NotInitialised)?;

        let daily_cap: i128 = env
            .storage()
            .instance()
            .get(&DataKey::DailyCap)
            .unwrap_or(DEFAULT_DAILY_CAP);

        let reward_amount = if amount > 0 {
            amount
        } else {
            milestone_default_amount(&milestone)
        };

        let day = env.ledger().timestamp() / 86400;
        let daily_key = DataKey::DailyDisbursed(learner.clone(), day);
        let today_total: i128 = env.storage().temporary().get(&daily_key).unwrap_or(0);

        if today_total + reward_amount > daily_cap {
            return Err(Error::DailyCapExceeded);
        }

        let token_client = token::Client::new(&env, &token_address);
        token_client.transfer(&admin, &learner, &reward_amount);

        env.storage().temporary().set(&daily_key, &(today_total + reward_amount));

        let total_key = DataKey::TotalDisbursed(learner.clone());
        let total: i128 = env.storage().persistent().get(&total_key).unwrap_or(0);
        env.storage().persistent().set(&total_key, &(total + reward_amount));

        env.events().publish((symbol_short!("reward"),), (learner, reward_amount));
        Ok(())
    }

    /// Get total LEARN tokens disbursed to a learner.
    pub fn total_disbursed(env: Env, learner: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::TotalDisbursed(learner))
            .unwrap_or(0)
    }

    /// Get daily cap.
    pub fn get_daily_cap(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::DailyCap)
            .unwrap_or(DEFAULT_DAILY_CAP)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn test_initialise_and_disburse_reward() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(RewardContract, ());
        let client = RewardContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let learner = Address::generate(&env);

        let token_admin = Address::generate(&env);
        let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
        let token_id = token_contract.address();
        let token_admin_client = token::StellarAssetClient::new(&env, &token_id);

        // Mint tokens to admin so contract can transfer from admin
        token_admin_client.mint(&admin, &1000_0000000);

        client.initialise(&admin, &token_id);

        assert_eq!(client.get_daily_cap(), DEFAULT_DAILY_CAP);

        // Disburse module complete default reward
        client.disburse_reward(&learner, &MilestoneType::ModuleComplete, &0);
        assert_eq!(client.total_disbursed(&learner), 1_0000000);

        // Disburse course complete default reward (10 LEARN)
        client.disburse_reward(&learner, &MilestoneType::CourseComplete, &0);
        assert_eq!(client.total_disbursed(&learner), 11_0000000);

        // Custom reward amount
        client.disburse_reward(&learner, &MilestoneType::StreakBonus, &20_0000000);
        assert_eq!(client.total_disbursed(&learner), 31_0000000);
    }

    #[test]
    fn test_daily_cap_exceeded() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(RewardContract, ());
        let client = RewardContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let learner = Address::generate(&env);

        let token_admin = Address::generate(&env);
        let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
        let token_id = token_contract.address();
        let token_admin_client = token::StellarAssetClient::new(&env, &token_id);

        token_admin_client.mint(&admin, &1000_0000000);
        client.initialise(&admin, &token_id);

        // Try to disburse more than daily cap (100 LEARN)
        let result = client.try_disburse_reward(&learner, &MilestoneType::CourseComplete, &101_0000000);
        assert!(result.is_err());
    }

    #[test]
    fn test_uninitialised_fails() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(RewardContract, ());
        let client = RewardContractClient::new(&env, &contract_id);
        let learner = Address::generate(&env);

        let result = client.try_disburse_reward(&learner, &MilestoneType::ModuleComplete, &0);
        assert!(result.is_err());
    }
}
