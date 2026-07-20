docker buildx build --platform linux/arm64 --load -t verekia/noisetoy .
docker save verekia/noisetoy | gzip > /tmp/noisetoy.tar.gz
scp /tmp/noisetoy.tar.gz midgar:/tmp/
ssh midgar docker load --input /tmp/noisetoy.tar.gz
ssh midgar docker compose up -d noisetoy
