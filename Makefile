#!make
#----------------------------------------
# Settings
#----------------------------------------
.DEFAULT_GOAL := help
#--------------------------------------------------
# Targets
#--------------------------------------------------
install: ## Installs node dependencies
	@npm install
check: ## Checks code for linting/construct errors
	@echo "==> Checking if files are well formatted..."
	@npm run lint
	@npm run detect-secrets
	@echo "    [✓]\n"
build: ## Empty target for uniform make interfaces because API does not neet to be build
run: ## Runs the UI 
	@npm start
.PHONY:install check run help
clean: ## Cleans up node modules files
	@echo "==> Cleaning up node modules ..."
	@rm -r node_modules
	@echo "    [✓]"
	@echo ""
help: ## Shows available targets
	@fgrep -h "## " $(MAKEFILE_LIST) | fgrep -v fgrep | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-13s\033[0m %s\n", $$1, $$2}'
