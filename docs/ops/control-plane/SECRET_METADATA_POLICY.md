# Secret & Config Metadata Policy (Public Repo)

## secret_registry.json

Stores **secrets only** (API keys, webhook secrets, service role keys).

### Allowed fields

`env_name`, `provider`, `environment`, `secret_class`, `purpose`, `rotation_policy`, `owner_role`, `vault_ref`, `last_verified_at`, `verification_level`

### Forbidden in Git

`full_value`, `masked_value`, `suffix`, `last4`, `fingerprint`

## config_id_registry.json

Stores **non-secret config IDs** (Stripe Price env mappings).

### Allowed fields

`logical_name`, `env_name`, `provider`, `environment`, `purpose`, `expected_amount`, `currency`, `product_key`, `vault_ref`, `human_verified`, `last_verified_at`, `verification_level`

### Forbidden in Git

`full_price_id`, `price_id_suffix`, dashboard screenshots, provider exports

## Vault

Full values and Human-verified suffixes live only in:

`VAULT-M55/<provider>/<environment>/<release_id>/<evidence_type>`

## Rotation

On loss: rotate at provider; do not reconstruct from Git suffix alone.

## Scanning

Run `scripts/ops/secret_scan.py` before commit. Scanner reports path/type/offset only.
