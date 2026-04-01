#!/usr/bin/env bash
npm ci
npm run audit
curl -fsS http://localhost:3000/home/ >/dev/null && echo " OK: /home/"