#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, contracterror, token, Address, Env, String};

#[contracttype]
#[derive(Clone, PartialEq, Debug)]
pub enum VoteType {
    For,
    Against,
    Abstain,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Proposal {
    pub id: u64,
    pub proposer: Address,
    pub description: String,
    pub votes_for: i128,
    pub votes_against: i128,
    pub executed: bool,
    pub created_at: u64,
}

#[contracttype]
pub enum DataKey {
    Admin,
    TokenAddress,
    Proposal(u64),
    ProposalCount,
    Vote(u64, Address), // (proposal_id, voter)
}

#[contracterror]
#[derive(Debug, Copy, Clone, PartialEq)]
pub enum Error {
    NotFound = 1,
    AlreadyVoted = 2,
    AlreadyExecuted = 3,
    QuorumNotMet = 4,
    NotInitialised = 5,
    Unauthorised = 6,
}

const MIN_QUORUM: i128 = 1000_0000000; // 1000 LEARN votes required

#[contract]
pub struct GovernanceContract;

#[contractimpl]
impl GovernanceContract {
    /// Initialise the governance contract with an admin and LEARN token address.
    /// The token address is used to query voter balances on-chain.
    pub fn initialise(env: Env, admin: Address, token_address: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::Unauthorised);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::TokenAddress, &token_address);
        Ok(())
    }

    /// Submit a governance proposal.
    pub fn submit_proposal(
        env: Env,
        proposer: Address,
        description: String,
    ) -> Result<u64, Error> {
        proposer.require_auth();

        let count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::ProposalCount)
            .unwrap_or(0);
        let id = count + 1;

        let proposal = Proposal {
            id,
            proposer,
            description,
            votes_for: 0,
            votes_against: 0,
            executed: false,
            created_at: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&DataKey::Proposal(id), &proposal);
        env.storage().instance().set(&DataKey::ProposalCount, &id);
        Ok(id)
    }

    /// Cast a vote on a proposal. Vote weight = voter's on-chain token balance.
    ///
    /// The token balance is queried directly from the token contract — callers
    /// cannot supply their own balance.
    pub fn cast_vote(
        env: Env,
        voter: Address,
        proposal_id: u64,
        vote: VoteType,
    ) -> Result<(), Error> {
        voter.require_auth();

        // Ensure the contract is initialised
        let token_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenAddress)
            .ok_or(Error::NotInitialised)?;

        // Query the voter's token balance directly from the token contract
        let token_client = token::Client::new(&env, &token_address);
        let token_balance = token_client.balance(&voter);

        let vote_key = DataKey::Vote(proposal_id, voter.clone());
        if env.storage().temporary().has(&vote_key) {
            return Err(Error::AlreadyVoted);
        }

        let mut proposal: Proposal = env
            .storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .ok_or(Error::NotFound)?;

        match vote {
            VoteType::For => proposal.votes_for += token_balance,
            VoteType::Against => proposal.votes_against += token_balance,
            VoteType::Abstain => {}
        }

        env.storage().persistent().set(&DataKey::Proposal(proposal_id), &proposal);
        env.storage().temporary().set(&vote_key, &true);
        Ok(())
    }

    /// Execute a passed proposal.
    pub fn execute_proposal(env: Env, proposal_id: u64) -> Result<(), Error> {
        let mut proposal: Proposal = env
            .storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .ok_or(Error::NotFound)?;

        if proposal.executed {
            return Err(Error::AlreadyExecuted);
        }
        if proposal.votes_for < MIN_QUORUM || proposal.votes_for <= proposal.votes_against {
            return Err(Error::QuorumNotMet);
        }

        proposal.executed = true;
        env.storage().persistent().set(&DataKey::Proposal(proposal_id), &proposal);
        Ok(())
    }

    /// Get a proposal by ID.
    pub fn get_proposal(env: Env, proposal_id: u64) -> Result<Proposal, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .ok_or(Error::NotFound)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    /// Helper to set up a governance contract with a token for testing.
    fn setup_governance_with_token(
        env: &Env,
    ) -> (GovernanceContractClient, Address, Address) {
        let contract_id = env.register(GovernanceContract, ());
        let client = GovernanceContractClient::new(env, &contract_id);

        let admin = Address::generate(env);
        let token_admin = Address::generate(env);
        let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
        let token_id = token_contract.address();
        let token_admin_client = token::StellarAssetClient::new(env, &token_id);

        client.initialise(&admin, &token_id);

        (client, admin, token_id)
    }

    /// Helper to mint tokens to an address for testing.
    fn mint_tokens(env: &Env, token_id: &Address, to: &Address, amount: i128) {
        let token_admin_client = token::StellarAssetClient::new(env, token_id);
        token_admin_client.mint(to, &amount);
    }

    #[test]
    fn test_submit_and_get_proposal() {
        let env = Env::default();
        env.mock_all_auths();

        let (client, _, _) = setup_governance_with_token(&env);

        let proposer = Address::generate(&env);
        let desc = String::from_str(&env, "Add Soroban Rust 201 Course");

        let id = client.submit_proposal(&proposer, &desc);
        assert_eq!(id, 1);

        let proposal = client.get_proposal(&id);
        assert_eq!(proposal.id, 1);
        assert_eq!(proposal.proposer, proposer);
        assert_eq!(proposal.description, desc);
        assert_eq!(proposal.votes_for, 0);
        assert_eq!(proposal.votes_against, 0);
        assert_eq!(proposal.executed, false);
    }

    #[test]
    fn test_voting_and_execution() {
        let env = Env::default();
        env.mock_all_auths();

        let (client, _, token_id) = setup_governance_with_token(&env);

        let proposer = Address::generate(&env);
        let voter1 = Address::generate(&env);
        let voter2 = Address::generate(&env);

        // Mint tokens to voters
        mint_tokens(&env, &token_id, &voter1, 1500_0000000); // 1500 LEARN
        mint_tokens(&env, &token_id, &voter2, 200_0000000);  // 200 LEARN

        let id = client.submit_proposal(&proposer, &String::from_str(&env, "Proposal 1"));

        // Voter 1 votes For — weight = 1500 LEARN (queried from token contract)
        client.cast_vote(&voter1, &id, &VoteType::For);

        // Voter 2 votes Against — weight = 200 LEARN
        client.cast_vote(&voter2, &id, &VoteType::Against);

        let proposal = client.get_proposal(&id);
        assert_eq!(proposal.votes_for, 1500_0000000);
        assert_eq!(proposal.votes_against, 200_0000000);

        // Double voting fails
        let double_vote = client.try_cast_vote(&voter1, &id, &VoteType::For);
        assert!(double_vote.is_err());

        // Execute proposal succeeds (1500 > quorum of 1000, and for > against)
        client.execute_proposal(&id);
        let executed_proposal = client.get_proposal(&id);
        assert!(executed_proposal.executed);

        // Re-executing fails
        let re_exec = client.try_execute_proposal(&id);
        assert!(re_exec.is_err());
    }

    #[test]
    fn test_quorum_not_met_execution_fails() {
        let env = Env::default();
        env.mock_all_auths();

        let (client, _, token_id) = setup_governance_with_token(&env);

        let proposer = Address::generate(&env);
        let voter = Address::generate(&env);

        // Mint only 500 LEARN to voter (under 1000 quorum)
        mint_tokens(&env, &token_id, &voter, 500_0000000);

        let id = client.submit_proposal(&proposer, &String::from_str(&env, "Low vote proposal"));
        client.cast_vote(&voter, &id, &VoteType::For);

        let result = client.try_execute_proposal(&id);
        assert!(result.is_err());
    }

    #[test]
    fn test_initialise_prevents_double_init() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(GovernanceContract, ());
        let client = GovernanceContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let token_admin = Address::generate(&env);
        let token_contract = env.register_stellar_asset_contract_v2(token_admin);
        let token_id = token_contract.address();

        client.initialise(&admin, &token_id);

        // Second initialisation should fail
        let re_init = client.try_initialise(&admin, &token_id);
        assert!(re_init.is_err());
    }

    #[test]
    fn test_cast_vote_uninitialised_fails() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(GovernanceContract, ());
        let client = GovernanceContractClient::new(&env, &contract_id);

        let proposer = Address::generate(&env);
        let voter = Address::generate(&env);

        let id = client.submit_proposal(&proposer, &String::from_str(&env, "Test proposal"));

        // Cast vote without initialisation should fail
        let result = client.try_cast_vote(&voter, &id, &VoteType::For);
        assert!(result.is_err());
    }

    #[test]
    fn test_abstain_does_not_affect_counts() {
        let env = Env::default();
        env.mock_all_auths();

        let (client, _, token_id) = setup_governance_with_token(&env);

        let proposer = Address::generate(&env);
        let voter = Address::generate(&env);
        mint_tokens(&env, &token_id, &voter, 3000_0000000); // 3000 LEARN

        let id = client.submit_proposal(&proposer, &String::from_str(&env, "Test abstain"));
        client.cast_vote(&voter, &id, &VoteType::Abstain);

        let proposal = client.get_proposal(&id);
        assert_eq!(proposal.votes_for, 0);
        assert_eq!(proposal.votes_against, 0);
    }
}
