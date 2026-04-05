#!/bin/sh
# Копия логики в docker-compose.yml (сервис minio-init): на Windows bind-mount этого файла даёт CRLF и ломает sh.
set -e
sleep 2
i=0
ok=0
while [ "$i" -lt 45 ]; do
  if mc alias set local http://minio:9000 "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}"; then
    ok=1
    break
  fi
  i=$((i + 1))
  sleep 2
done
if [ "$ok" != 1 ]; then
  echo "minio-init: could not connect to minio:9000" >&2
  exit 1
fi
mc mb local/mixmaster --ignore-existing
