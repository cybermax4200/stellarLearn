NETWORK ?= testnet
SOURCE  ?= default

.PHONY: build test deploy-testnet deploy-mainnet clean

build:
	cargo build --target wasm32-unknown-unknown --release

test:
	cargo test

clean:
	cargo clean

deploy-testnet: build
	@echo "Deploying CredentialContract to testnet..."
	stellar contract deploy \
		--wasm credential/target/wasm32-unknown-unknown/release/credential_contract.wasm \
		--source $(SOURCE) --network testnet
	@echo "Deploying RewardContract to testnet..."
	stellar contract deploy \
		--wasm reward/target/wasm32-unknown-unknown/release/reward_contract.wasm \
		--source $(SOURCE) --network testnet
	@echo "Deploying CourseAccessContract to testnet..."
	stellar contract deploy \
		--wasm access/target/wasm32-unknown-unknown/release/access_contract.wasm \
		--source $(SOURCE) --network testnet
	@echo "Deploying GovernanceContract to testnet..."
	stellar contract deploy \
		--wasm governance/target/wasm32-unknown-unknown/release/governance_contract.wasm \
		--source $(SOURCE) --network testnet

deploy-mainnet: build
	@echo "⚠️  Deploying to MAINNET — this is irreversible!"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ]
	stellar contract deploy \
		--wasm credential/target/wasm32-unknown-unknown/release/credential_contract.wasm \
		--source $(SOURCE) --network mainnet
