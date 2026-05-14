#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, contracterror, Address, Env, String};

#[contracttype]
pub enum DataKey {
    ModuleUnlocked(Address, String, u32), // (learner, course_id, module_id)
    ScoreThreshold,
}

#[contracterror]
#[derive(Debug, Copy, Clone, PartialEq)]
pub enum Error {
    PrerequisiteNotMet = 1,
    AlreadyUnlocked = 2,
}

const DEFAULT_SCORE_THRESHOLD: u32 = 60; // 60%

#[contract]
pub struct CourseAccessContract;

#[contractimpl]
impl CourseAccessContract {
    /// Unlock a module for a learner once prerequisites are met.
    pub fn unlock_module(
        env: Env,
        learner: Address,
        course_id: String,
        module_id: u32,
        prior_score: u32, // 0-100
    ) -> Result<bool, Error> {
        let threshold: u32 = env
            .storage()
            .instance()
            .get(&DataKey::ScoreThreshold)
            .unwrap_or(DEFAULT_SCORE_THRESHOLD);

        // Module 0 is always unlocked (first module)
        if module_id > 0 && prior_score < threshold {
            return Err(Error::PrerequisiteNotMet);
        }

        let key = DataKey::ModuleUnlocked(learner, course_id, module_id);
        env.storage().persistent().set(&key, &true);
        Ok(true)
    }

    /// Check if a module is unlocked for a learner.
    pub fn is_unlocked(env: Env, learner: Address, course_id: String, module_id: u32) -> bool {
        let key = DataKey::ModuleUnlocked(learner, course_id, module_id);
        env.storage().persistent().get(&key).unwrap_or(false)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn test_first_module_always_unlocked() {
        let env = Env::default();
        let id = env.register(CourseAccessContract, ());
        let client = CourseAccessContractClient::new(&env, &id);
        let learner = Address::generate(&env);
        let course = String::from_str(&env, "stellar-fundamentals");
        let result = client.unlock_module(&learner, &course, &0, &0);
        assert_eq!(result, true);
    }

    #[test]
    fn test_subsequent_module_requires_passing_score() {
        let env = Env::default();
        let id = env.register(CourseAccessContract, ());
        let client = CourseAccessContractClient::new(&env, &id);
        let learner = Address::generate(&env);
        let course = String::from_str(&env, "stellar-fundamentals");

        // Fail: score below threshold
        let result = client.try_unlock_module(&learner, &course, &1, &50);
        assert!(result.is_err());

        // Pass: score above threshold
        let result = client.unlock_module(&learner, &course, &1, &75);
        assert_eq!(result, true);
    }
}
