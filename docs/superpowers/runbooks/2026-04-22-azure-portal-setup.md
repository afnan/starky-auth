# Azure Portal Setup Runbook — Starky Auth

**Target:** provision all Azure infrastructure for the Keycloak central auth stack, entirely through the Azure portal. Pair this with the design spec at `docs/superpowers/specs/2026-04-22-keycloak-azure-deployment-design.md`.

**Time:** ~45–60 minutes, one sitting.

---

## Before you start — gather these

| Item | How to get it | Write it down |
|---|---|---|
| Subscription name / ID | Portal → **Subscriptions** | |
| Confirm `rg-starkyapp` exists and you have Contributor | Portal → **Resource groups** → `rg-starkyapp` → IAM | |
| Confirm `starkyacr` exists and you have AcrPush | Portal → **Container registries** → `starkyacr` | |
| Your current public IP | `curl ifconfig.me` from your laptop | |
| An ACME email (Let's Encrypt expiry notices) | Likely `accounts@allspicetech.com.au` | |
| Hostinger DNS panel access for `starkyapp.com` | Hostinger login | |
| Strong passwords for Keycloak admin and Postgres | `openssl rand -base64 32` twice | Save in a password manager, NOT here |

---

## Tags to apply on every resource

Every resource you create: go to the **Tags** tab / section and add:

| Key | Value |
|---|---|
| `project` | `starky-auth` |
| `env` | `prod` |
| `component` | (varies per resource — see each step) |
| `managed-by` | `portal` |
| `owner` | `accounts@allspicetech.com.au` |

If you ever migrate to Bicep/Terraform, flip `managed-by` to `bicep` / `terraform` for those resources.

---

## Phase 1 — Networking

### 1.1 Create the VNet

1. Portal → **Create a resource** → search **Virtual network** → **Create**.
2. **Basics:**
   - Subscription: your subscription
   - Resource group: `rg-starkyapp`
   - Name: `vnet-starky-auth`
   - Region: **Australia East**
3. **IP addresses:**
   - IPv4 address space: `10.40.0.0/24` (delete the default `10.0.0.0/16`)
   - Subnet: delete the default `default` subnet, then **Add subnet**:
     - Name: `snet-auth`
     - Subnet address range: `10.40.0.0/27`
     - NAT gateway: **None**
     - Service endpoints: leave empty
4. **Security:** leave all off.
5. **Tags:** add the standard set, with `component=network`.
6. **Review + create** → **Create**. Wait ~1 min.

### 1.2 Create the NSG

1. Portal → **Create a resource** → search **Network security group** → **Create**.
2. **Basics:**
   - Resource group: `rg-starkyapp`
   - Name: `nsg-starky-auth-prod`
   - Region: **Australia East**
3. **Tags:** standard set, `component=network`.
4. **Create**. Wait ~30 sec.
5. Open the new NSG → **Inbound security rules** → **Add** (do this twice):

   **Rule 1 — HTTP:**
   - Source: **Any**
   - Source port ranges: `*`
   - Destination: **Any**
   - Service: **HTTP** (auto-fills port 80)
   - Protocol: TCP
   - Action: **Allow**
   - Priority: `100`
   - Name: `Allow-HTTP`

   **Rule 2 — HTTPS:**
   - Source: **Any**
   - Source port ranges: `*`
   - Destination: **Any**
   - Service: **HTTPS** (auto-fills port 443)
   - Protocol: TCP
   - Action: **Allow**
   - Priority: `110`
   - Name: `Allow-HTTPS`

   **Do NOT add an explicit deny rule.** Azure's built-in `DenyAllInBound` at priority 65500 already handles this, and an explicit lower-priority deny would later block legit intra-VNet traffic.

6. Go to **Subnets** → **Associate** → pick `vnet-starky-auth` / `snet-auth`. This attaches the NSG to the subnet.

### 1.3 Create the Static Public IP

1. Portal → **Create a resource** → **Public IP address** → **Create**.
2. **Basics:**
   - Name: `pip-starky-auth-prod`
   - Region: **Australia East**
   - SKU: **Standard**
   - Tier: **Regional**
   - IP address assignment: **Static**
   - Idle timeout: 4 (default)
   - DNS name label: leave blank (we're using Hostinger DNS)
3. **Resource group:** `rg-starkyapp`.
4. **Tags:** standard set, `component=network`.
5. **Review + create** → **Create**.
6. After creation, **write down the IP address** — you need it for the Hostinger DNS step.

---

## Phase 2 — Identities and Storage

### 2.1 Create the VM Managed Identity

This identity is attached to the VM. It pulls images from ACR and uploads backups to Storage.

1. Portal → **Create a resource** → search **User Assigned Managed Identity** → **Create**.
2. **Basics:**
   - Resource group: `rg-starkyapp`
   - Region: **Australia East**
   - Name: `id-starky-auth-vm`
3. **Tags:** standard set, `component=identity`.
4. **Review + create** → **Create**.

### 2.2 Create the Deployer Managed Identity (for GitHub Actions)

This is separate from the VM identity so a repo compromise can't touch the VM's runtime identity. It's used by Actions to push to ACR and invoke `az vm run-command`.

**Important:** you mentioned you already have an Actions → Azure OIDC identity for the frontend. You can either:

- **Reuse it** (simpler): skip creating a new MI, just add the new role assignments and federated credential subject to the existing identity.
- **Create a new dedicated one** (cleaner blast radius): follow the steps below.

My recommendation: **create a new dedicated one** — it's 2 minutes and gives you clean separation.

1. **Create a resource** → **User Assigned Managed Identity** → **Create**.
2. Same RG, region.
3. Name: `id-starky-auth-deployer`.
4. Tags: `component=identity`.
5. **Create**.

### 2.3 Create the Storage Account for Backups

1. **Create a resource** → **Storage account** → **Create**.
2. **Basics:**
   - Resource group: `rg-starkyapp`
   - Storage account name: `ststarkyauthbackups` (if taken, try `ststarkyauthbkp01` or similar — must be lowercase, 3–24 chars, globally unique)
   - Region: **Australia East**
   - Primary service: **Azure Blob Storage or Azure Data Lake Storage Gen 2**
   - Performance: **Standard**
   - Redundancy: **Locally-redundant storage (LRS)** — this is backup; single-region durability is fine, cheaper
3. **Advanced:**
   - Require secure transfer: **Enabled**
   - Allow enabling anonymous access: **Disabled**
   - Enable storage account key access: **Enabled** (needed for some tooling; we authenticate via MI anyway)
   - Minimum TLS version: **1.2**
   - Rest: defaults
4. **Networking:** **Enable public access from all networks** (backup upload from VM goes over the Azure backbone; we use identity-based auth for security, not network restriction).
5. **Data protection:** Leave defaults. (Soft delete for blobs is nice-to-have; not required.)
6. **Encryption:** defaults (Microsoft-managed keys).
7. **Tags:** standard set, `component=storage`.
8. **Review + create** → **Create**.
9. After creation, open the storage account:
   - **Data storage** → **Containers** → **+ Container** → name `pgdumps`, public access level **Private**, **Create**.
   - **Data management** → **Lifecycle management** → **+ Add a rule**:
     - Rule name: `pgdumps-retention`
     - Rule scope: **Limit blobs with filters**
     - Blob type: **Block blobs**
     - Blob subtype: **Base blobs**
     - **Next → Base blobs:**
       - Move to cool storage: after **30** days since last modified
       - Delete the blob: after **90** days since last modified
     - **Next → Filter set:**
       - Prefix match: `pgdumps/`
     - **Add**.

---

## Phase 3 — The VM

### 3.1 Generate an SSH key locally (one-time)

Even though the NSG keeps port 22 closed to the internet, Azure requires SSH auth at VM creation, and you'll want the key for the Serial Console as a break-glass mechanism.

On your laptop (Git Bash / WSL / PowerShell with OpenSSH):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/vm-starky-auth-prod -C "azureuser@vm-starky-auth-prod"
```

Leave passphrase blank or add one (your call). This creates `~/.ssh/vm-starky-auth-prod` (private) and `~/.ssh/vm-starky-auth-prod.pub` (public). **Save the private key somewhere safe** — a password manager with file-attach is best. You will almost never use this, but you'll want it on the rare day you do.

Open the `.pub` file in a text editor and copy its contents — you paste it into the portal next.

### 3.2 Create the VM

1. Portal → **Create a resource** → **Virtual machine** → **Create**.

2. **Basics:**
   - Resource group: `rg-starkyapp`
   - Virtual machine name: `vm-starky-auth-prod`
   - Region: **Australia East**
   - Availability options: **No infrastructure redundancy required** (single-VM by design)
   - Security type: **Standard** (Trusted launch is fine if offered; adds ~0 cost)
   - Image: **Ubuntu Server 22.04 LTS – x64 Gen2**
   - VM architecture: **x64**
   - Run with Azure Spot discount: **No** (never for auth infra)
   - Size: **Standard_B2s – 2 vCPU, 4 GiB** (search for `B2s` and pick the one labeled Standard_B2s)
   - Authentication type: **SSH public key**
   - Username: `azureuser`
   - SSH public key source: **Use existing public key**
   - SSH public key: paste the contents of `~/.ssh/vm-starky-auth-prod.pub`
   - Public inbound ports: **None** (NSG manages this; do not let the wizard open 22)

3. **Disks:**
   - OS disk type: **Premium SSD (locally-redundant storage)**
   - OS disk size: `64 GiB` (click "Change size" if default is lower; pick P6 if prompted)
   - Delete with VM: **checked**
   - Encryption at host: **checked** (optional but free and good practice)
   - No data disks

4. **Networking:**
   - Virtual network: `vnet-starky-auth`
   - Subnet: `snet-auth (10.40.0.0/27)`
   - Public IP: **Click "Create new"** and select the existing → wait, portal may not allow picking existing from here. If not, leave the wizard default and we'll swap next.
     - **Easier:** pick **None** here; after VM is created, go to VM → Networking → attach `pip-starky-auth-prod` to the NIC.
     - Actually, some portal versions let you pick existing. If so, pick `pip-starky-auth-prod`. If the dropdown shows only "Create new", pick None and attach manually post-create.
   - NIC network security group: **None** (subnet already has the NSG)
   - Delete public IP and NIC when VM is deleted: **unchecked** (we want the IP to persist)

5. **Management:**
   - Enable system assigned managed identity: **No** (we're using user-assigned)
   - User-assigned managed identity: **Add** → pick `id-starky-auth-vm`
   - Enable auto-shutdown: **No**
   - Boot diagnostics: **Enable with managed storage account** (recommended; needed for Serial Console)
   - Identity: **Azure AD login**: Off (not needed)
   - Patch orchestration: **Azure orchestrated** (optional; we also run unattended-upgrades in the guest)

6. **Monitoring:**
   - Enable recommended alert rules: **Off** for now (we'll add targeted ones later if needed)

7. **Advanced:**
   - Extensions, apps, custom data, user data: leave defaults
   - Cloud init can pre-install Docker if you want; I'll cover that in the implementation plan. Leave blank for now.

8. **Tags:** standard set, `component=vm`.

9. **Review + create** → **Create**. Takes ~2–3 minutes.

### 3.3 Attach the static public IP (only if you picked "None" in step 4)

1. Open the new VM → **Networking** → click the NIC name (e.g. `vm-starky-auth-prodXXX`).
2. On the NIC → **IP configurations** → click `ipconfig1`.
3. Public IP address: **Associate** → select `pip-starky-auth-prod` → **Save**.
4. Back on the VM overview, confirm **Public IP address** shows the static IP you created.

### 3.4 Assign roles to the VM managed identity

The MI needs to pull from ACR and write to Storage.

**Role 1 — AcrPull on `starkyacr`:**

1. Portal → **Container registries** → `starkyacr` → **Access control (IAM)** → **Add** → **Add role assignment**.
2. Role: search **AcrPull**, pick it.
3. Members: **Managed identity** → **+ Select members** → **User-assigned managed identity** → pick `id-starky-auth-vm`.
4. **Review + assign**.

**Role 2 — Storage Blob Data Contributor on `ststarkyauthbackups`:**

1. Portal → **Storage accounts** → `ststarkyauthbackups` → **Access control (IAM)** → **Add role assignment**.
2. Role: **Storage Blob Data Contributor**.
3. Members: same pattern, pick `id-starky-auth-vm`.
4. **Review + assign**.

### 3.5 Assign roles to the deployer identity (Actions)

**Role 1 — AcrPush on `starkyacr`:**

1. Portal → `starkyacr` → **IAM** → **Add role assignment**.
2. Role: **AcrPush**.
3. Members: `id-starky-auth-deployer`.
4. **Review + assign**.

**Role 2 — Virtual Machine Contributor on the VM:**

This lets Actions run `az vm run-command invoke`.

1. Portal → `vm-starky-auth-prod` → **IAM** → **Add role assignment**.
2. Role: **Virtual Machine Contributor**.
3. Members: `id-starky-auth-deployer`.
4. Scope: resource-scoped to this VM only (not the whole RG) — the wizard does this by default when you start from the VM.
5. **Review + assign**.

---

## Phase 4 — Backup

### 4.1 Create (or reuse) a Recovery Services Vault

1. Portal → search **Recovery Services vaults**.
2. If one already exists in `rg-starkyapp` (check first), reuse it — skip to 4.2.
3. Otherwise **Create**:
   - Resource group: `rg-starkyapp`
   - Vault name: `rsv-starkyapp`
   - Region: **Australia East**
4. **Properties** (after create) → **Backup Configuration** → **Modify** → Storage replication type: **Geo-redundant** (default — don't change to LRS; Azure Backup LRS cannot be changed back once backups start).
5. **Tags:** `component=backup`.

### 4.2 Enable backup on the VM

1. Open `rsv-starkyapp` → **Backup** (left menu, under "Protected items" or the dashboard tile).
2. **+ Backup** or **Configure Backup**.
3. Datasource type: **Virtual machine**.
4. Native operating system: **Azure**.
5. **Backup policy:**
   - **Create a new policy:**
     - Name: `starky-auth-daily-30d`
     - Policy sub-type: **Standard**
     - Backup schedule: **Daily**
     - Time: `02:00`
     - Timezone: `UTC`
     - Retention of daily backup point: **30 Days**
     - Weekly, Monthly, Yearly: **disabled**
6. **Virtual machines:** **Add** → pick `vm-starky-auth-prod` → **OK**.
7. **Enable backup**.

### 4.3 Take an on-demand backup to verify

1. `rsv-starkyapp` → **Backup items** → **Azure Virtual Machine** → `vm-starky-auth-prod`.
2. **Backup now** → leave default retention → **OK**.
3. Takes ~15–30 min. You can proceed with other phases meanwhile.

---

## Phase 5 — DNS at Hostinger

1. Log into Hostinger → **Domains** → `starkyapp.com` → **DNS / Nameservers** (or **DNS Zone**).
2. Add two **A records**:

   | Type | Name | Points to | TTL |
   |---|---|---|---|
   | A | `auth` | *(your static IP from Phase 1.3)* | 300 |
   | A | `auth-admin` | *(same IP)* | 300 |

3. **Save**.
4. Verify from your laptop (wait 1–5 min for propagation):
   ```bash
   nslookup auth.starkyapp.com
   nslookup auth-admin.starkyapp.com
   ```
   Both must return the static IP. **If they don't, do not proceed** — Caddy will burn a Let's Encrypt rate-limit slot on first boot if DNS isn't ready.

5. After the first deploy is verified working, come back and bump both TTLs to **3600**.

---

## Phase 6 — GitHub OIDC federation for the deployer identity

This lets Actions authenticate to Azure without a long-lived secret.

1. Portal → `id-starky-auth-deployer` → **Federated credentials** (left menu).
2. **+ Add credential** → **Scenario: GitHub Actions deploying Azure resources**.
3. Fill in:
   - Organization: your GitHub org / username
   - Repository: `starky-auth` (whatever the repo name is on GitHub)
   - Entity type: **Branch**
   - GitHub branch name: `main`
   - Name: `starky-auth-main`
   - (Audience: `api://AzureADTokenExchange` — prefilled)
4. **Add**.

You'll need these values in your GitHub Actions workflow (stored as repo secrets, NOT hardcoded):

- **`AZURE_CLIENT_ID`** — from the MI's Overview page: **Client ID**
- **`AZURE_TENANT_ID`** — from the MI's Overview page: **Tenant ID** (or Directory (tenant) ID)
- **`AZURE_SUBSCRIPTION_ID`** — from any resource page, or Subscription page

Set these in GitHub → repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**, one at a time.

---

## Phase 7 — Post-provision sanity check

Before handing off to the implementation plan (which will create Dockerfile, workflow files, etc.), verify the infrastructure is sane:

- [ ] VM is running (portal shows **Status: Running**)
- [ ] VM's managed identity is `id-starky-auth-vm` (Portal → VM → Identity → User assigned)
- [ ] VM's public IP matches the one you put in Hostinger DNS
- [ ] NSG has exactly two allow rules (80, 443) and no explicit deny row
- [ ] `curl http://<static-ip>/` returns connection refused or similar (nothing is listening yet — that's expected, confirms the VM is reachable but no service is up)
- [ ] `dig +short auth.starkyapp.com` returns the static IP
- [ ] `id-starky-auth-vm` has roles: **AcrPull** on `starkyacr`, **Storage Blob Data Contributor** on `ststarkyauthbackups`
- [ ] `id-starky-auth-deployer` has roles: **AcrPush** on `starkyacr`, **Virtual Machine Contributor** on the VM
- [ ] Recovery Services vault has the VM enrolled
- [ ] `pgdumps` container exists in storage with the lifecycle rule
- [ ] GitHub Actions federated credential is configured on `id-starky-auth-deployer`
- [ ] `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` set as repo secrets

Once all boxes are checked, you're ready for the implementation plan — which will write the Dockerfile, Actions workflows, and the remaining file changes in the repo.

---

## When you hit a snag

- **VM won't start:** check the Activity log on the VM. Most common: region capacity (switch to `Standard_B2ms` temporarily or retry later).
- **Role assignment takes 5–10 min to propagate.** If a test fails right after assigning, wait and retry before investigating.
- **`ststarkyauthbackups` name taken:** try `ststarkyauthbkp01`. Update the spec and implementation plan to match.
- **Portal shows "no public IP to select" when creating the VM:** pick None, then attach after VM create (step 3.3). This is a wizard quirk.
- **Federated credential shows "Issuer URL invalid":** the repo must exist on GitHub first. Create an empty repo if needed.
