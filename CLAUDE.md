@AGENTS.md




<!-- cloude-code-toolbox:mcp-skills-awareness-begin -->

### MCP & Skills awareness (Cloude Code ToolBox)

_Last synced: 2026-10-03T13:15:48.043Z._

- **Full report:** `.claude/cloude-code-toolbox-mcp-skills-awareness.md` in this workspace (auto-overwritten on each scan). Use it as ground truth for configured servers and skill folders.
- **MCP:** For **live tools** in Claude Code, enable the matching server via `/mcp`. Servers are configured in `~/.claude.json` (user) and `.mcp.json` (project).
- **When the user’s task matches a server** (e.g. Confluence work and a **Confluence** / **Atlassian** MCP is listed), **prefer that server id** and plan on tool use—not only file search.
- **Skills:** Folders below contain `SKILL.md`; attach or cite paths in chat when relevant.

#### Workspace MCP

- `d:\Knoux Store\.mcp.json` _(workspace: Knoux Store)_ — _file missing_

_No active workspace servers in mcp.json._

#### User MCP

- `C:\Users\k7\.claude.json` — _servers defined_

| Server id | Kind | Detail |
|-----------|------|--------|
| supabase | http | https://mcp.supabase.com/mcp?project_ref=ngdwybpgacauorygoedi&read_only=true&features=branching,functions,development,debugging,database,account,docs,storage |
| io.github.wonderwhy-er/desktop-commander | stdio | npx --registry https://registry.npmjs.org @wonderwhy-er/desktop-commander@0.2.52 |
| io.github.github/github-mcp-server | http | https://api.githubcopilot.com/mcp/ |
| microsoft/markitdown | stdio | uvx markitdown-mcp@0.0.1a4 |
| microsoft/playwright-mcp | stdio | npx @playwright/mcp@latest |
| io.github.ChromeDevTools/chrome-devtools-mcp | stdio | npx --registry https://registry.npmjs.org chrome-devtools-mcp@1.10.1 |
| io.github.netdata/mcp-server | http | https://app.netdata.cloud/api/v1/mcp |
| io.github.upstash/context7 | http | https://mcp.context7.com/mcp |
| oraios/serena | stdio | uvx --from git+https://github.com/oraios/serena serena start-mcp-server serena@latest --context ide-assistant |
| io.github.SonarSource/sonarqube-mcp-server | stdio | docker run -i --rm -e SONARQUBE_TOKEN -e SONARQUBE_ORG -e SONARQUBE_URL docker.io/sonarsource/sonarqube-mcp |
| datacloud_bigquery_remote | http | https://bigquery.googleapis.com/mcp |
| datacloud_spanner_remote | http | https://spanner.googleapis.com/mcp |
| datacloud_alloydb_remote | http | https://alloydb.googleapis.com/mcp |
| datacloud_cloud-sql_remote | http | https://sqladmin.googleapis.com/mcp |
| datacloud_knowledge_catalog_remote | http | https://dataplex.googleapis.com/mcp |
| datacloud_dataproc_remote | http | https://dataproc-asia-east1.googleapis.com/mcp |
| datacloud_gcs_remote | http | https://storage.googleapis.com/storage/mcp |
| datacloud_bigtable-admin_remote | http | https://bigtableadmin.googleapis.com/mcp |
| datacloud_bigtable-data_remote | http | https://bigtable.googleapis.com/mcp |

#### Project skills

_None found (or no workspace open)._

#### User skills

- **accidental-data-loss-prevention** — `C:\Users\k7\.copilot\skills\accidental-data-loss-prevention` — |

- **bigquery-ai-ml** — `C:\Users\k7\.copilot\skills\bigquery-ai-ml` — Leverages BigQuery's built-in machine learning and GenAI capabilities

- **bigquery-bigframes** — `C:\Users\k7\.copilot\skills\bigquery-bigframes` — Generates Python code using BigQuery DataFrames (BigFrames). Use by\

- **bigquery-data-transfer-service** — `C:\Users\k7\.copilot\skills\bigquery-data-transfer-service` — Discovers and inspects BigQuery Data Transfer Service (DTS) configurations.

- **bigquery-graph-author** — `C:\Users\k7\.copilot\skills\bigquery-graph-author` — Provides an end-to-end journey for authoring a BigQuery property graph

- **bigquery-graph-query** — `C:\Users\k7\.copilot\skills\bigquery-graph-query` — Provides guidelines and best practices for querying BigQuery property

- **bigquery-sql** — `C:\Users\k7\.copilot\skills\bigquery-sql` — Provides BigQuery SQL query optimization techniques, execution best practices,

- **bigtable-basics** — `C:\Users\k7\.copilot\skills\bigtable-basics` — Assists in provisioning instances/tables, designing performant schemas,

- **building-data-apps** — `C:\Users\k7\.copilot\skills\building-data-apps` — |

- **data-autocleaning** — `C:\Users\k7\.copilot\skills\data-autocleaning` — Automated data quality and transformation capabilities for Dataform/dbt/BigQuery

- **dataform-bigquery** — `C:\Users\k7\.copilot\skills\dataform-bigquery` — Expertise in generating clean, correct, and efficient Dataform pipeline

- **dbt-bigquery** — `C:\Users\k7\.copilot\skills\dbt-bigquery` — Expert guidance for creating, modifying, and optimizing dbt pipelines

- **discovering-gcp-data-assets** — `C:\Users\k7\.copilot\skills\discovering-gcp-data-assets` — |

- **enforcing-resource-attribution** — `C:\Users\k7\.copilot\skills\enforcing-resource-attribution` — Enforces resource attribution for CLI commands. Use this skill whenever

- **federate-lakehouse-catalog** — `C:\Users\k7\.copilot\skills\federate-lakehouse-catalog` — Sets up Google Cloud Lakehouse federated catalogs to remote Iceberg

- **gcp-composer-troubleshooting** — `C:\Users\k7\.copilot\skills\gcp-composer-troubleshooting` — Provides expert guidance for troubleshooting Cloud Composer (Apache

- **gcp-data-pipelines** — `C:\Users\k7\.copilot\skills\gcp-data-pipelines` — Primary entry point for building, managing, and orchestrating data pipelines

- **gcp-dataflow** — `C:\Users\k7\.copilot\skills\gcp-dataflow` — |

- **gcp-managed-airflow-dag-authoring** — `C:\Users\k7\.copilot\skills\gcp-managed-airflow-dag-authoring` — Guides the authoring and validation of Apache Airflow DAGs for Managed

- **gcp-managed-airflow-migrations** — `C:\Users\k7\.copilot\skills\gcp-managed-airflow-migrations` — Provides guidance for migrating Apache Airflow DAGs in Managed Service

- **gcp-managed-airflow-recommendations** — `C:\Users\k7\.copilot\skills\gcp-managed-airflow-recommendations` — Provides recommendations and best practices for creating, configuring,

- **gcp-managed-spark-upgrades** — `C:\Users\k7\.copilot\skills\gcp-managed-spark-upgrades` — Upgrades GCP Spark/Dataproc jobs to newer versions by analyzing, remediating,\

- **gcp-pipeline-orchestration** — `C:\Users\k7\.copilot\skills\gcp-pipeline-orchestration` — This skill helps the agent generate or update orchestration pipeline

- **gcp-pipeline-resource-provisioning** — `C:\Users\k7\.copilot\skills\gcp-pipeline-resource-provisioning` — |

- **gcp-spark** — `C:\Users\k7\.copilot\skills\gcp-spark` — |

- **gcp-spark-troubleshooting** — `C:\Users\k7\.copilot\skills\gcp-spark-troubleshooting` — Provides expert guidance for troubleshooting Google Cloud Spark and Dataproc

- **gcs-security-assessment** — `C:\Users\k7\.copilot\skills\gcs-security-assessment` — Assesses the security posture of Google Cloud Storage (GCS) buckets\

- **google-cloud-auth-verification** — `C:\Users\k7\.copilot\skills\google-cloud-auth-verification` — Mandatory Step 0 pre-flight execution order and authentication verification

- **google-cloud-storage-basics** — `C:\Users\k7\.copilot\skills\google-cloud-storage-basics` — Stores, retrieves, and manages data as objects in Cloud Storage (Google\

- **google-cloud-storage-bucket-architect** — `C:\Users\k7\.copilot\skills\google-cloud-storage-bucket-architect` — Creates Cloud Storage (Google Cloud Storage, or GCS) buckets. Analyzes\

- **google-cloud-storage-fuse** — `C:\Users\k7\.copilot\skills\google-cloud-storage-fuse` — Mounts Cloud Storage buckets as a POSIX file system with Cloud Storage\

- **managing-python-dependencies** — `C:\Users\k7\.copilot\skills\managing-python-dependencies` — |

- **ml-best-practices** — `C:\Users\k7\.copilot\skills\ml-best-practices` — |

- **notebook-guidance** — `C:\Users\k7\.copilot\skills\notebook-guidance` — |-

- **schema-mapping** — `C:\Users\k7\.copilot\skills\schema-mapping` — Guides the process of analyzing, mapping, and documenting transformations

- **skill-repair** — `C:\Users\k7\.copilot\skills\skill-repair` — |

- **microsoft-foundry** — `C:\Users\k7\.agents\skills\microsoft-foundry` — Build, deploy, evaluate, optimize, fine-tune, and manage Microsoft Foundry agents, models, and resources end to end. USE FOR: foundry, azd ai agent, azd provision/deploy, hosted agent scaffold/develop/run/deploy/troubles

<!-- cloude-code-toolbox:mcp-skills-awareness-end -->
