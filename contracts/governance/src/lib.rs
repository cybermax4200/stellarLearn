#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, contracterror, Address, Env, String};

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
}

const MIN_QUORUM: i128 = 1000_0000000; // 1000 LEARN votes required

#[contract]
pub struct GovernanceContract;

#[contractimpl]
impl GovernanceContract {
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

    /// Cast a vote on a proposal. Weight = token_balance.
    pub fn cast_vote(
        env: Env,
        voter: Address,
        proposal_id: u64,
        vote: VoteType,
        token_balance: i128, // caller provides balance; verify via token contract in prod
    ) -> Result<(), Error> {
        voter.require_auth();

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

    #[test]
    fn test_submit_and_get_proposal() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(GovernanceContract, ());
        let client = GovernanceContractClient::new(&env, &contract_id);

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

        let contract_id = env.register(GovernanceContract, ());
        let client = GovernanceContractClient::new(&env, &contract_id);

        let proposer = Address::generate(&env);
        let voter1 = Address::generate(&env);
        let voter2 = Address::generate(&env);

        let id = client.submit_proposal(&proposer, &String::from_str(&env, "Proposal 1"));

        // Voter 1 votes For with 1500 LEARN (meets MIN_QUORUM of 1000)
        client.cast_vote(&voter1, &id, &VoteType::For, &1500_0000000);

        // Voter 2 votes Against with 200 LEARN
        client.cast_vote(&voter2, &id, &VoteType::Against, &200_0000000);

        let proposal = client.get_proposal(&id);
        assert_eq!(proposal.votes_for, 1500_0000000);
        assert_eq!(proposal.votes_against, 200_0000000);

        // Double voting fails
        let double_vote = client.try_cast_vote(&voter1, &id, &VoteType::For, &100_0000000);
        assert!(double_vote.is_err());

        // Execute proposal succeeds
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

        let contract_id = env.register(GovernanceContract, ());
        let client = GovernanceContractClient::new(&env, &contract_id);

        let proposer = Address::generate(&env);
        let voter = Address::generate(&env);

        let id = client.submit_proposal(&proposer, &String::from_str(&env, "Low vote proposal"));
        // Only 500 LEARN voted (under 1000 quorum)
        client.cast_vote(&voter, &id, &VoteType::For, &500_0000000);

        let result = client.try_execute_proposal(&id);
        assert!(result.is_err());
    }
}
