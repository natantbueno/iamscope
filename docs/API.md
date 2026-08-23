# IAM Scope API — v1

Cross-cloud IAM role catalog as versioned static JSON. No key, no signup, no rate
limit, no backend.

> **Status: specification, not yet live.**
> `/api/v1/` returns 404 today. This document is the contract that
> `scripts/build-api.js` implements in Phase 1 — every field, filename and count
> below is binding on that script, and the `check-api-contract.js` checker fails
> the build when they drift. Nothing here should be published on the site before
> the files actually respond. Last revised 2026-08-22.

---

## What this is

Six cloud platforms describe privilege in six incompatible vocabularies. Entra ID
says `ControlPlane`, AWS says `FullAccess`, GCP says `ProjectOwner`, Google
Workspace says `SuperAdmin`. If you operate more than one cloud, you cannot
compare them without building a translation table by hand.

This API is that table, kept current, with the raw provider data attached:

- **4,640 roles and managed policies** across Entra ID, Azure RBAC, AWS, GCP,
  Google Workspace and IBM Cloud.
- Every record carries **both** the provider's own tier and a normalized
  `eamLevel` (0/1/2) from the Enterprise Access Model.
- Every record links back to a citable page and to the provider's documentation.

## What this is not

- **Not a query API.** There is no search endpoint, no filtering, no pagination.
  You download a file and filter it yourself. The whole catalog without permission
  arrays is ~250 KB gzipped — smaller than most single-page JavaScript bundles.
- **Not an authority.** `eamLevel`, `category` and `isPrivileged` are editorial
  classification by IAM Scope. No cloud provider publishes them. See
  [Classification is editorial](#classification-is-editorial).
- **Not a place to send your data.** There is no POST, no request body, no
  telemetry, no cookie. The API is files on a CDN. Your tenant IDs, role
  assignments and policy documents have nowhere to go, because there is nothing
  listening.

---

## Quickstart

```bash
# 1. What exists, how big it is, when it was generated
curl -s https://iamscope.cloud/api/v1/index.json | jq '{generatedAt, files: (.files | length)}'

# 2. Every AWS managed policy that grants control-plane access
curl -s https://iamscope.cloud/api/v1/roles/aws.json \
  | jq -r '.items[] | select(.eamLevel == 0) | "\(.name)\t\(.nativeTier)"'

# 3. The tier dictionary — how each provider's ladder maps to 0/1/2
curl -s https://iamscope.cloud/api/v1/meta/tiers.json | jq '.platforms.gcp'
```

That is the entire learning curve. There is no step 4.

---

## The files

Base URL: `https://iamscope.cloud/api/v1/`

| File | Records | Approx. size |
|---|---:|---:|
| `index.json` | — | 4 KB |
| `roles/all.json` | 4,640 | 1.5 MB (250 KB gz) |
| `roles/entra.json` | 144 | 60 KB |
| `roles/azure.json` | 504 | 190 KB |
| `roles/aws.json` | 1,582 | 620 KB |
| `roles/gcp.json` | 2,389 | 780 KB |
| `roles/workspace.json` | 14 | 12 KB |
| `roles/ibm.json` | 7 | 8 KB |
| `permissions/aws.json` | 16,423 actions | 900 KB |
| `permissions/gcp.json` | 13,701 permissions | 1.2 MB |
| `permissions/azure.json` | 17,605 with descriptions | 2.1 MB |
| `permissions/entra.json` | 1,504 Graph API permissions | 640 KB |
| `meta/sources.json` | — | 12 KB |
| `meta/tiers.json` | — | 6 KB |

`roles/all.json` is the six platform files concatenated, **without** the
`permissions` array on each record. Use it when you need breadth; use a platform
file when you need the permission lists.

### `index.json` is the manifest

Read this first, cache the rest. It tells you what changed without downloading
anything large:

```json
{
  "apiVersion": "v1",
  "generatedAt": "2026-08-22T18:54:36Z",
  "license": "CC-BY-4.0",
  "attribution": "IAM Scope — https://iamscope.cloud",
  "counts": { "roles": 4640, "platforms": 6, "sodRules": 190 },
  "files": [
    {
      "path": "roles/aws.json",
      "bytes": 634112,
      "sha256": "9f2c…",
      "count": 1582,
      "lastSynced": "2026-08-21"
    }
  ]
}
```

Compare the `sha256` you stored against the one in the manifest. If it matches,
you already have the current file and you can skip the download entirely.

---

## The record

Every role in every platform file has the same shape. Platform-specific fields
are added, never substituted.

```json
{
  "platform": "aws",
  "kind": "managed-policy",
  "id": "arn:aws:iam::aws:policy/AdministratorAccess",
  "slug": "administratoraccess",
  "name": "AdministratorAccess",
  "description": "Provides full access to AWS services and resources.",

  "nativeTier": "FullAccess",
  "eamLevel": 0,
  "category": "Management",
  "isPrivileged": true,
  "permissionCount": 1,
  "deprecated": false,

  "url": "https://iamscope.cloud/aws/policies/administratoraccess/",
  "source": "https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AdministratorAccess.html",
  "lastSynced": "2026-08-21",

  "aws": {
    "arn": "arn:aws:iam::aws:policy/AdministratorAccess",
    "policyType": "managed",
    "scope": "account",
    "version": "v1 (default)",
    "createdAt": "2015-02-06T18:39:00Z",
    "editedAt": "2015-02-06T18:39:00Z"
  }
}
```

### Common fields

| Field | Type | Notes |
|---|---|---|
| `platform` | `entra` \| `azure` \| `aws` \| `gcp` \| `workspace` \| `ibm` | |
| `kind` | `role` \| `managed-policy` | AWS entries are policies, not roles. Everything else is a role. |
| `id` | string | The provider's own identifier: GUID for Entra and Azure, ARN for AWS, `roles/x.y` for GCP. **Stable.** |
| `slug` | string | Our URL segment. Stable within a major version. |
| `name` | string | The provider's name, verbatim, never translated. |
| `description` | string | The provider's description, verbatim, never translated. |
| `nativeTier` | string | The provider's own ladder. Values differ per platform — see `meta/tiers.json`. |
| `eamLevel` | `0` \| `1` \| `2` \| `null` | Normalized. **Editorial.** See below. |
| `category` | string | Editorial grouping (`IAM`, `Compute`, `Security`, …). |
| `isPrivileged` | boolean | Editorial. |
| `permissionCount` | number | **Counts written patterns, not effective breadth.** Read [the traps](#three-traps-that-will-bite-you). |
| `deprecated` | boolean | |
| `url` | string | The IAM Scope page. Use this when citing. |
| `source` | string | The provider's documentation. |
| `lastSynced` | `YYYY-MM-DD` | When this dataset was last verified against the source. |

### Platform blocks

Provider-specific fields live under a key named after the platform, so a
consumer that only reads common fields never has to know they exist.

| Platform | Block | Contains |
|---|---|---|
| `entra` | `entra` | `templateId`, `tierSource` |
| `azure` | `azure` | `assignableScopes`, `permissions[]` with `type` (`Actions`, `NotActions`, `DataActions`, `NotDataActions`) |
| `aws` | `aws` | `arn`, `policyType`, `scope`, `version`, `createdAt`, `editedAt` |
| `gcp` | `gcp` | `roleId`, `stage`, `scope`, `lowestResources` |
| `workspace` | `workspace` | `privileges[]`, `apiPrivileges[]`, `apiPrivilegesComplete` |
| `ibm` | `ibm` | `accessModel` (`iam` \| `classic`), `roleKind` (`platform` \| `service`) |

---

## `eamLevel` — the field this API exists for

The Enterprise Access Model collapses every provider's ladder into three levels:

| Level | Name | What it controls |
|---|---|---|
| `0` | Control Plane | Identity and access itself. Compromise here means everything below is compromised. |
| `1` | Management Plane | Resource administration. |
| `2` | Workload / Data | Reading or operating inside a resource. |
| `null` | Unclassified | Only in Entra ID, for roles EntraOps has not classified. **Handle it.** |

The mapping for all six platforms is in `meta/tiers.json`, and it is the same
table the site uses — `src/lib/eamLevels.ts`.

```json
{
  "platforms": {
    "aws":   { "FullAccess": 0, "PowerUser": 1, "Operator": 1, "Specialized": 1, "ReadOnly": 2 },
    "gcp":   { "ProjectOwner": 0, "Admin": 0, "Editor": 1, "Operator": 1, "Developer": 1, "Specialized": 1, "Viewer": 2 },
    "azure": { "FullControl": 0, "AccessManagement": 0, "Contributor": 1, "DataPlane": 1, "Specialized": 1, "Reader": 2 },
    "entra": { "ControlPlane": 0, "ManagementPlane": 1, "UserAccess": 2, "Unclassified": null },
    "workspace": { "SuperAdmin": 0, "DelegatedAdmin": 1, "ServiceAdmin": 1, "SpecializedAdmin": 1, "ReadOnly": 2 },
    "ibm":   { "AccountAdmin": 0, "PlatformAdmin": 1, "PlatformOperator": 1, "ServiceManager": 1, "ReadOnly": 2 }
  }
}
```

### Classification is editorial

`eamLevel`, `category` and `isPrivileged` are **our judgment, not the provider's
statement**. No cloud vendor publishes a risk tier for its own roles. Every file
says so in its header:

```json
{ "classification": "iamscope-editorial" }
```

For Entra ID the source is Thomas Naunheim's
[EntraOps](https://github.com/Cloud-Architekt/AzurePrivilegedIAM) (MIT). For the
other five platforms the classification is ours, documented on the `/reference`
pages of the site.

Use it to prioritize, triage and sort. Do not cite it as vendor documentation,
and do not let it be the only input to an access decision.

---

## Three traps that will bite you

These are not hypothetical. Each one produced a real bug in the site itself
before it was understood, and each one will produce the same bug in your
integration if you skip this section.

### 1. `permissionCount` counts strings, not power

```
AdministratorAccess          permissionCount: 1     grants: everything
AIDevOpsAgentAccessPolicy    permissionCount: 914   grants: a lot, but bounded
AlexaForBusinessFullAccess   permissionCount: 9     grants: one product
```

`AdministratorAccess` contains a single statement: `"Action": "*"`. Sorting your
inventory by `permissionCount` descending puts the most dangerous policy in AWS
at the bottom of the list.

**Sort by `eamLevel` and `isPrivileged`. Use `permissionCount` for display only.**

### 2. Exclusion is per principal, not per entry

Azure roles carry `NotActions` and `NotDataActions`. AWS policy documents carry
`Effect: Deny`. The correct evaluation is:

> Granted if **some positive pattern matches** *and* **no negative pattern matches**.

Subtracting the negative entry from the positive count gives the right answer
only in trivial cases. Azure's `Contributor` grants `*` and excludes writes to
`Microsoft.Authorization`; `AmazonConnectServiceLinkedRolePolicy` grants
`profile:*` and denies `profile:CreateDomain`. Counting will not get you there —
you have to match patterns on both sides.

There are policies that grant nothing at all. `AWSDenyAll` is one. If your code
reports it as full access, this is why.

### 3. `*` alone is not a wildcard like the others

`s3:Get*` tells you something about the action. `*` tells you nothing. If you
treat them the same way:

- `AdministratorAccess` becomes the "closest match" for every query, because it
  matches everything.
- Any action you invent, including typos, resolves to the highest tier.

Exclude the bare `*` from matching, ranking and level inference. Handle it as a
separate case that means "unbounded".

---

## Known data limits

Publishing these is more useful than pretending they do not exist.

| Platform | Limit |
|---|---|
| **IBM Cloud** | All 7 roles have `permissions: []`. IBM does not publish the action list for platform roles. The tier and description are real; the permission array is empty because the source is empty. |
| **Google Workspace** | Privileges are prose names, not API identifiers. 11 of 14 roles have matching native identifiers in `apiPrivileges`; `apiPrivilegesComplete` tells you which. |
| **Entra ID** | `eamLevel` can be `null` for roles EntraOps has not classified. Do not coerce `null` to `2` — treat it as unknown and surface it for review. |
| **Azure RBAC** | 3 documentation categories return 404 upstream (`mixed-reality`, `virtual-desktop-infrastructure`, `other`). The 504 total still reconciles, but a future gap would appear here first. |
| **All** | `description` is the provider's text. Some are one word. Some contradict the role's actual permissions. We do not rewrite them — that would break citability. |

---

## Making the call

### curl + jq

```bash
BASE=https://iamscope.cloud/api/v1

# Every control-plane role across all six clouds, as TSV
curl -s $BASE/roles/all.json \
  | jq -r '.items[] | select(.eamLevel == 0)
           | [.platform, .name, .nativeTier] | @tsv'

# One role by its provider ID
curl -s $BASE/roles/azure.json \
  | jq '.items[] | select(.id == "acdd72a7-3385-48ef-bd42-f606fba81ae7")'

# How many privileged roles per platform
curl -s $BASE/roles/all.json \
  | jq -r '.items | map(select(.isPrivileged)) | group_by(.platform)
           | map({platform: .[0].platform, count: length}) | .[]
           | "\(.platform)\t\(.count)"'
```

### Python

```python
import json, urllib.request

BASE = "https://iamscope.cloud/api/v1"

def fetch(path):
    with urllib.request.urlopen(f"{BASE}/{path}") as r:
        return json.load(r)

catalog = fetch("roles/all.json")
by_id = {r["id"]: r for r in catalog["items"]}

role = by_id["arn:aws:iam::aws:policy/AdministratorAccess"]
print(role["name"], "→ EAM level", role["eamLevel"])
```

### PowerShell

```powershell
$Base = 'https://iamscope.cloud/api/v1'
$Catalog = Invoke-RestMethod "$Base/roles/all.json"

# Index by provider ID for O(1) lookup
$ById = @{}
foreach ($r in $Catalog.items) { $ById[$r.id] = $r }

$ById['acdd72a7-3385-48ef-bd42-f606fba81ae7'] |
    Select-Object platform, name, nativeTier, eamLevel, isPrivileged
```

### Browser / JavaScript

CORS is open (`Access-Control-Allow-Origin: *`), so this runs in a page with no
proxy:

```js
const base = 'https://iamscope.cloud/api/v1'
const { items } = await fetch(`${base}/roles/gcp.json`).then(r => r.json())

const tier0 = items.filter(r => r.eamLevel === 0)
console.log(`${tier0.length} of ${items.length} GCP roles are control plane`)
```

> The internal files at the site root — `gcp-roles-official.json`,
> `search-index.json`, `azure-perms-index.json` and the rest — respond with
> `X-IAMScope-Contract: internal-unstable` and **deliberately have no CORS**.
> They are the site's own working files, they change shape whenever a collector
> changes, and they are not covered by any of the guarantees in this document.
> `/api/v1/` is the contract. Nothing else is.

---

## Use case: enriching an inventory or SIEM

**The problem.** Your role-assignment log tells you that `svc-deploy-prod` holds
`b24988ac-6180-42a0-ab88-20f7382dd24c`. That is a GUID. Your alert rules cannot
prioritize a GUID, and neither can the analyst reading the alert at 3am.

**The shape of the solution.** Join once at ingest, not per event. Download the
catalog on a schedule, index it by provider ID, and attach `eamLevel`,
`nativeTier` and `isPrivileged` to every assignment as it arrives.

```python
#!/usr/bin/env python3
"""Enrich role assignments with IAM Scope risk classification.

Reads a JSON array of {principal, platform, roleId} on stdin,
writes the same records with classification attached, ordered by risk.
"""
import json, sys, hashlib, pathlib, urllib.request

BASE  = "https://iamscope.cloud/api/v1"
CACHE = pathlib.Path("~/.cache/iamscope").expanduser()


def catalog():
    """Download roles/all.json only when the manifest digest changed."""
    CACHE.mkdir(parents=True, exist_ok=True)
    local = CACHE / "all.json"

    with urllib.request.urlopen(f"{BASE}/index.json") as r:
        manifest = json.load(r)
    want = next(f["sha256"] for f in manifest["files"] if f["path"] == "roles/all.json")

    if local.exists():
        have = hashlib.sha256(local.read_bytes()).hexdigest()
        if have == want:
            return json.loads(local.read_text())["items"]

    with urllib.request.urlopen(f"{BASE}/roles/all.json") as r:
        body = r.read()
    if hashlib.sha256(body).hexdigest() != want:
        raise SystemExit("digest mismatch — refusing to use this download")

    local.write_bytes(body)
    return json.loads(body)["items"]


UNKNOWN = {
    "eamLevel": None,
    "nativeTier": None,
    "isPrivileged": None,
    "note": "not in catalog — custom role, or catalog is stale",
}

def main():
    by_id = {r["id"]: r for r in catalog()}
    assignments = json.load(sys.stdin)

    out = []
    for a in assignments:
        hit = by_id.get(a["roleId"])
        out.append({**a, **(
            {
                "roleName":     hit["name"],
                "eamLevel":     hit["eamLevel"],
                "nativeTier":   hit["nativeTier"],
                "isPrivileged": hit["isPrivileged"],
                "reference":    hit["url"],
            } if hit else UNKNOWN
        )})

    # Unknown first — an unmatched assignment is a finding, not a blank cell.
    out.sort(key=lambda r: (r["eamLevel"] is not None, r["eamLevel"] or 0))
    json.dump(out, sys.stdout, indent=2)


if __name__ == "__main__":
    main()
```

**Two decisions in that script worth copying.**

*Unmatched assignments sort first, not last.* A role that is not in the catalog is
either a custom role somebody created — which is exactly what a review should
look at — or a sign that your copy of the catalog is out of date. Both deserve
attention. Silently writing `null` into a column and sorting it to the bottom
turns a finding into a blank cell.

*The digest is verified after download, not just before.* If the bytes do not
match the manifest, the script refuses to run rather than enriching your SIEM
with something it cannot identify.

**Do not call the API per event.** One assignment log can produce millions of
lookups a day. Fetch the catalog once per day into your own store and join
locally — the data changes when a provider publishes a new role, which is a
weekly rhythm at most.

---

## Use case: ordering an access review by risk

**The problem.** A recertification campaign hands the reviewer 400 assignments
in alphabetical order. `AcrDelete` comes before `Owner`. Attention runs out
around row 60, and the rows that mattered were at the bottom.

**The shape of the solution.** Sort by what the role can do, so the reviewer
spends their first hour on control-plane access and their last hour on readers.

```powershell
<#
.SYNOPSIS
  Builds a recertification worklist ordered by Enterprise Access Model level.
.EXAMPLE
  Get-AzRoleAssignment | New-IAMScopeReviewList | Export-Csv review.csv -NoTypeInformation
#>
function New-IAMScopeReviewList {
    [CmdletBinding()]
    param(
        [Parameter(ValueFromPipeline)] $Assignment,
        [string] $Base = 'https://iamscope.cloud/api/v1'
    )

    begin {
        $catalog = Invoke-RestMethod "$Base/roles/azure.json"
        $byId    = @{}
        $byName  = @{}
        foreach ($r in $catalog.items) {
            $byId[$r.id]     = $r
            $byName[$r.name] = $r
        }
        $rows = [System.Collections.Generic.List[object]]::new()
    }

    process {
        foreach ($a in $Assignment) {
            # Get-AzRoleAssignment gives RoleDefinitionId as a bare GUID and
            # RoleDefinitionName as the display name. Prefer the GUID: names are
            # not unique across clouds, and two Microsoft tools disagree about
            # which one the key "Name" refers to.
            $hit = $null
            if ($a.RoleDefinitionId)   { $hit = $byId[  ($a.RoleDefinitionId -split '/')[-1] ] }
            if (-not $hit -and $a.RoleDefinitionName) { $hit = $byName[$a.RoleDefinitionName] }

            $rows.Add([pscustomobject]@{
                Principal    = $a.DisplayName
                PrincipalId  = $a.ObjectId
                Scope        = $a.Scope
                Role         = if ($hit) { $hit.name } else { $a.RoleDefinitionName }
                EamLevel     = if ($hit) { $hit.eamLevel } else { $null }
                Plane        = switch ($hit.eamLevel) {
                                   0       { 'Control Plane' }
                                   1       { 'Management Plane' }
                                   2       { 'Workload / Data' }
                                   default { 'UNKNOWN — review first' }
                               }
                IsPrivileged = if ($hit) { $hit.isPrivileged } else { $null }
                Reference    = $hit.url
            })
        }
    }

    end {
        # $null sorts before 0 in PowerShell, which is what we want:
        # anything the catalog could not identify goes to the top.
        $rows | Sort-Object EamLevel, @{ Expression = 'IsPrivileged'; Descending = $true }, Role
    }
}
```

**Why match on the GUID first.** Microsoft's own tools disagree about what `name`
means. `az role definition list` emits `"name": "<guid>"` with the display name
in `roleName`. `Get-AzRoleDefinition` emits `"Name": "Reader"` with the GUID in
`Id`. JSON keys are case-insensitive to most parsers, so `Name` and `name` collide
and carry opposite meanings. **The shape of the value is what disambiguates them:**
a GUID is an identifier, anything else is a name. Match on the identifier and fall
back to the name, never the reverse.

**Why UNKNOWN sorts to the top.** A custom role is not a low-risk role — it is an
unclassified one, and unclassified is where surprises live. The same applies to
Entra ID assignments where `eamLevel` is `null`.

---

## Versioning

The version is in the path. `v1` is frozen once published.

**A new `v1` file is published on every data refresh.** New roles appear, counts
change, descriptions get corrected. That is not a breaking change and does not
bump the version.

**Breaking changes get a `v2` path**, and `v1` keeps responding. Because the API
is generated at build time, keeping both costs nothing.

| Change | Breaking? |
|---|---|
| New roles, changed counts, corrected descriptions | No |
| New optional field | No |
| New value in an existing enum (a new `category`) | No |
| Removing or renaming a field | **Yes** |
| Changing the meaning of `eamLevel` | **Yes** |
| Changing a `slug` (it is in `url`) | **Yes** |

Write your parser to ignore unknown fields. If it breaks when a field is added,
it will break on a Tuesday.

### Caching

| Path | `Cache-Control` |
|---|---|
| `index.json` | `public, max-age=300, stale-while-revalidate=3600` |
| everything else under `v1/` | `public, max-age=3600, stale-while-revalidate=86400` |

Poll `index.json`, compare `sha256`, download only what changed.

### Pinning a version

For anything reproducible — a build, a compliance snapshot, a product that embeds
the catalog — do not fetch the live URL. Each data refresh is published as a
GitHub Release with the same files attached, immutable per tag:

```bash
gh release download data-2026-08-22 --repo natantbueno/entraid.permissions --pattern '*.json'
```

This is also the right channel if you are embedding the catalog in a commercial
product. The live site runs on a hosting plan intended for personal use, and a
product calling it in production is a problem for both of us. The release assets
are not.

---

## License and attribution

The catalog is three layers with different owners. Full text in
[`DATA-LICENSE.md`](../DATA-LICENSE.md).

| Layer | License |
|---|---|
| Raw provider facts — names, IDs, actions, official descriptions | Microsoft / AWS / Google / IBM terms. Not relicensed by us. |
| IAM Scope curation — `eamLevel`, tiers, categories, `isPrivileged`, the 190 SoD rules, the 29 cross-cloud equivalences | **CC BY 4.0** |
| Entra `eamTier` (EntraOps) and Graph API permissions (merill/microsoft-info) | MIT, attribution required |

Minimum credit, and it must be reachable by the end user of your software — not
buried in a dependency manifest:

```
Risk classification and tiers: IAM Scope (https://iamscope.cloud), CC BY 4.0.
```

Commercial use is allowed. You do not need permission and you do not need to open
your source.

## No warranty

Provided as is. The classification is informed editorial opinion, not an audit.
It does not replace review by your own security team, and an access decision made
on this catalog alone is the responsibility of whoever made it.

---

## Questions this document should answer, and does not

If you hit one of these, the gap is real and worth reporting:

- Cross-cloud equivalences (`compare/equivalences.json`) and the 190 SoD rules are
  **not in v1**. They exist on the site. They are not in the API yet.
- There is no endpoint that evaluates a role definition you paste in. That is
  deliberate: the evaluator runs entirely in your browser and never transmits what
  you paste. An API for it would break that guarantee.
- There is no changelog feed. `generatedAt` and the per-file `lastSynced` in
  `index.json` are what you have.
