#!/bin/bash
cd ~/pcbackupmgmt
docker compose down
docker rmi pcbackupmgmt:latest -f
docker compose up -d --build

