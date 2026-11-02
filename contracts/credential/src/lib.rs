#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, contracterror, Address, Env, String, Vec, symbol_short};

#[contracttype]
#[derive(Clone)]
pub struct Credential {
    pub learner: Address,
    pub course_id: String,
    pub metadata_hash: String, // IPFS CID
    pub issued_at: u64,
}

#[contracttype]
pub enum DataKey {
    Admin,
    Credential(Address, String), // (learner, course_id)
    LearnerCredentials(Address),
}

#[contracterror]
#[derive(Debug, Copy, Clone, PartialEq)]
pub enum Error {
    AlreadyIssued = 1,
    NotFound = 2,
    Unauthorised = 3,
    NotInitialised = 4,
}

#[contract]
pub struct CredentialContract;

#[contractimpl]
impl CredentialContract {
    /// Initialise the credential contract with an admin (issuer) address.
    pub fn initialise(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::Unauthorised);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        Ok(())
    }

    /// Issue a credential NFT to a learner's Stellar wallet.
    /// Only callable by the platform trigger keypair (admin) if initialised.
    pub fn issue_credential(
        env: Env,
        learner: Address,
        course_id: String,
        metadata_hash: String,
    ) -> Result<(), Error> {
        if let Some(admin) = env.storage().instance().get::<DataKey, Address>(&DataKey::Admin) {
            admin.require_auth();
        }

        let key = DataKey::Credential(learner.clone(), course_id.clone());

        if env.storage().persistent().has(&key) {
            return Err(Error::AlreadyIssued);
        }

        let credential = Credential {
            learner: learner.clone(),
            course_id: course_id.clone(),
            metadata_hash,
            issued_at: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&key, &credential);

        // Append to learner's credential list
        let list_key = DataKey::LearnerCredentials(learner.clone());
        let mut list: Vec<String> = env
            .storage()
            .persistent()
            .get(&list_key)
            .unwrap_or_else(|| Vec::new(&env));
        list.push_back(course_id);
        env.storage().persistent().set(&list_key, &list);

        env.events().publish((symbol_short!("issued"),), (learner,));
        Ok(())
    }

    /// Get a specific credential for a learner.
    pub fn get_credential(
        env: Env,
        learner: Address,
        course_id: String,
    ) -> Result<Credential, Error> {
        let key = DataKey::Credential(learner, course_id);
        env.storage()
            .persistent()
            .get(&key)
            .ok_or(Error::NotFound)
    }

    /// Get all credential course IDs for a learner.
    pub fn get_credentials(env: Env, learner: Address) -> Vec<String> {
        let key = DataKey::LearnerCredentials(learner);
        env.storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| Vec::new(&env))
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn test_issue_and_get_credential() {
        let env = Env::default();
        let contract_id = env.register(CredentialContract, ());
        let client = CredentialContractClient::new(&env, &contract_id);

        let learner = Address::generate(&env);
        let course_id = String::from_str(&env, "stellar-fundamentals");
        let cid = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

        client.issue_credential(&learner, &course_id, &cid);

        let cred = client.get_credential(&learner, &course_id);
        assert_eq!(cred.course_id, course_id);
        assert_eq!(cred.metadata_hash, cid);
    }

    #[test]
    fn test_duplicate_credential_fails() {
        let env = Env::default();
        let contract_id = env.register(CredentialContract, ());
        let client = CredentialContractClient::new(&env, &contract_id);

        let learner = Address::generate(&env);
        let course_id = String::from_str(&env, "stellar-fundamentals");
        let cid = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

        client.issue_credential(&learner, &course_id, &cid);
        let result = client.try_issue_credential(&learner, &course_id, &cid);
        assert!(result.is_err());
    }

    #[test]
    fn test_get_all_credentials() {
        let env = Env::default();
        let contract_id = env.register(CredentialContract, ());
        let client = CredentialContractClient::new(&env, &contract_id);

        let learner = Address::generate(&env);
        let cid = String::from_str(&env, "QmHash");

        client.issue_credential(
            &learner,
            &String::from_str(&env, "course-1"),
            &cid,
        );
        client.issue_credential(
            &learner,
            &String::from_str(&env, "course-2"),
            &cid,
        );

        let creds = client.get_credentials(&learner);
        assert_eq!(creds.len(), 2);
    }

    #[test]
    fn test_admin_initialisation_and_auth() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(CredentialContract, ());
        let client = CredentialContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        client.initialise(&admin);

        // Cannot re-initialise
        let re_init = client.try_initialise(&admin);
        assert!(re_init.is_err());

        let learner = Address::generate(&env);
        let course_id = String::from_str(&env, "stellar-security");
        let cid = String::from_str(&env, "QmSecureHash");

        client.issue_credential(&learner, &course_id, &cid);
        let cred = client.get_credential(&learner, &course_id);
        assert_eq!(cred.course_id, course_id);
    }
}
