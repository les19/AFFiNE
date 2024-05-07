export

rebuild:
	BUILD_TYPE=stable ENABLE_PRELOADING=false PUBLIC_PATH='/' SELF_HOSTED=true SHOULD_REPORT_TRACE=false  yarn build \
	&& docker compose -f ./compose.yaml build --no-cache \
	&& docker compose -f ./compose.yaml down \
	&& docker compose -f ./compose.yaml up -d

ps:
	docker compose -f ./compose.yaml ps -a

lgos:
	docker compose -f ./compose.yaml logs -f
