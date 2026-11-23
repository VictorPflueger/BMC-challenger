// Every JSON Schema of the tool as an ES module: the page's security policy lets it fetch nothing from its
// own site, so schemas cannot be loaded as JSON files (PESTEL plan, probe P14). js/schema.js validates with
// them, and tests/schemas.mjs checks them.
//
//   HANDOFF     strategy-challenge/1, the handoff file of brief 4.3: a copy of
//               schemas/strategy-challenge-1.json, the canonical file shared by the set of four
//               (tests/schemas.mjs fails when the two differ)
//   OUTPUT      what each agent returns, sent as output_config.format (and the Scout's tool input): every
//               field required, no union types, additionalProperties false, only the keywords structured
//               outputs enforce; lengths, ranges and references are checked in code (js/guards.js)
//   CONTRACTS   the tool's own records, with the limits the output schemas cannot carry (brief section 10)

const BLOCKS = ["partners","activities","resources","value","relationships","channels","segments","costs","revenue"];
const ISSUE_TYPES = ["consistency", "customer", "competition", "technology", "regulation", "economy", "operations", "finance", "sustainability"];
const HORIZONS = ["now", "1-3y", "3y+"];
const CONFIDENCE = ["high", "medium", "low"];
const ITEM_ID = "^(" + BLOCKS.join("|") + ")-\\d+$";
const ISSUE_ID = "^I\\d+$";
const DATE_TIME = "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}(:\\d{2}(\\.\\d+)?)?(Z|[+-]\\d{2}:\\d{2})$";

/** strategy-challenge/1, as schemas/strategy-challenge-1.json carries it. */
export const HANDOFF = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "strategy-challenge-1.json",
  "title": "strategy-challenge/1",
  "description": "The handoff file every challenger of the set exports and the Prototype Ideator reads without a model call (brief 4.3). The same file in all four repositories; a change to the shape means a new schema name. Figures are numbers and the engine's; the file carries no API key, no prompt and no thinking.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "schema",
    "tool",
    "created",
    "language",
    "mode",
    "model",
    "company",
    "framework",
    "issues",
    "responses",
    "figures",
    "summary",
    "sources",
    "disclaimer"
  ],
  "properties": {
    "schema": {
      "const": "strategy-challenge/1"
    },
    "tool": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "name",
        "version",
        "url"
      ],
      "properties": {
        "id": {
          "enum": [
            "bmc-challenger",
            "swot-challenger",
            "pestel-challenger"
          ]
        },
        "name": {
          "type": "string",
          "minLength": 1
        },
        "version": {
          "type": "string",
          "pattern": "^\\d+\\.\\d+\\.\\d+$"
        },
        "url": {
          "type": "string",
          "pattern": "^https://"
        }
      }
    },
    "created": {
      "type": "string",
      "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}(:\\d{2}(\\.\\d+)?)?(Z|[+-]\\d{2}:\\d{2})$"
    },
    "language": {
      "enum": [
        "en",
        "de"
      ]
    },
    "mode": {
      "enum": [
        "simulation",
        "live"
      ]
    },
    "model": {
      "type": [
        "string",
        "null"
      ]
    },
    "company": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "name",
        "sector",
        "country",
        "description",
        "fictional"
      ],
      "properties": {
        "name": {
          "type": "string",
          "minLength": 1
        },
        "sector": {
          "type": "string",
          "pattern": "^[a-z][a-z_]*$"
        },
        "country": {
          "type": "string",
          "pattern": "^[A-Z]{2}$"
        },
        "description": {
          "type": "string"
        },
        "fictional": {
          "type": "boolean"
        }
      }
    },
    "framework": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "type",
        "areas"
      ],
      "properties": {
        "type": {
          "enum": [
            "bmc",
            "swot",
            "pestel"
          ]
        },
        "areas": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Area"
          }
        }
      }
    },
    "issues": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Issue"
      }
    },
    "responses": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Response"
      }
    },
    "figures": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "at_stake_eur_year",
        "left_eur_year",
        "upside_eur_year",
        "score",
        "pressure"
      ],
      "properties": {
        "at_stake_eur_year": {
          "type": "number",
          "minimum": 0
        },
        "left_eur_year": {
          "type": "number",
          "minimum": 0
        },
        "upside_eur_year": {
          "type": "number",
          "minimum": 0
        },
        "score": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "name",
            "scale",
            "before",
            "after"
          ],
          "properties": {
            "name": {
              "enum": [
                "resilience",
                "efe",
                "readiness"
              ]
            },
            "scale": {
              "enum": [
                "0-100",
                "1-4"
              ]
            },
            "before": {
              "type": "number"
            },
            "after": {
              "type": "number"
            }
          }
        },
        "pressure": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "label",
            "before",
            "after",
            "of"
          ],
          "properties": {
            "label": {
              "type": "string",
              "minLength": 1
            },
            "before": {
              "type": "integer",
              "minimum": 0
            },
            "after": {
              "type": "integer",
              "minimum": 0
            },
            "of": {
              "type": "integer",
              "minimum": 1
            }
          }
        }
      }
    },
    "summary": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "headline",
        "text"
      ],
      "properties": {
        "headline": {
          "type": "string",
          "minLength": 1
        },
        "text": {
          "type": "string"
        }
      }
    },
    "sources": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Source"
      }
    },
    "disclaimer": {
      "type": "string",
      "minLength": 1
    }
  },
  "$defs": {
    "AreaId": {
      "description": "The canvas's nine blocks, the four SWOT quadrants or the six PESTEL dimensions.",
      "enum": [
        "partners",
        "activities",
        "resources",
        "value",
        "relationships",
        "channels",
        "segments",
        "costs",
        "revenue",
        "strengths",
        "weaknesses",
        "opportunities",
        "threats",
        "political",
        "economic",
        "social",
        "technological",
        "environmental",
        "legal"
      ]
    },
    "Band": {
      "enum": [
        "low",
        "medium",
        "high",
        "critical"
      ]
    },
    "Scale": {
      "type": "integer",
      "minimum": 1,
      "maximum": 5
    },
    "Euros": {
      "type": [
        "number",
        "null"
      ],
      "minimum": 0
    },
    "Area": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "label",
        "items"
      ],
      "properties": {
        "id": {
          "$ref": "#/$defs/AreaId"
        },
        "label": {
          "type": "string",
          "minLength": 1
        },
        "items": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Item"
          }
        }
      }
    },
    "Item": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "text",
        "source"
      ],
      "properties": {
        "id": {
          "type": "string",
          "pattern": "^[a-z]+-\\d+$"
        },
        "text": {
          "type": "string",
          "minLength": 1
        },
        "source": {
          "enum": [
            "user",
            "ai"
          ]
        },
        "confidence": {
          "enum": [
            "high",
            "medium",
            "low"
          ]
        },
        "basis": {
          "type": "string"
        }
      }
    },
    "Kpi": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "name",
        "unit",
        "direction",
        "change_low",
        "change_high",
        "basis"
      ],
      "properties": {
        "id": {
          "type": "string",
          "pattern": "^[a-z][a-z_]*\\.[a-z0-9_]+$"
        },
        "name": {
          "type": "string",
          "minLength": 1
        },
        "unit": {
          "type": "string",
          "minLength": 1
        },
        "direction": {
          "enum": [
            "up",
            "down"
          ]
        },
        "change_low": {
          "type": "number"
        },
        "change_high": {
          "type": "number"
        },
        "basis": {
          "type": "string"
        }
      }
    },
    "Source": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "url",
        "title",
        "read_on"
      ],
      "properties": {
        "url": {
          "type": "string",
          "pattern": "^https?://"
        },
        "title": {
          "type": "string",
          "minLength": 1
        },
        "read_on": {
          "type": "string",
          "format": "date"
        }
      }
    },
    "Issue": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "title",
        "type",
        "description",
        "areas",
        "items",
        "impact",
        "likelihood",
        "band",
        "horizon",
        "kpis",
        "eur_year_low",
        "eur_year_high",
        "eur_year_expected",
        "eur_basis",
        "evidence",
        "confidence"
      ],
      "properties": {
        "id": {
          "type": "string",
          "pattern": "^I\\d+$"
        },
        "title": {
          "type": "string",
          "minLength": 1
        },
        "type": {
          "type": "string",
          "minLength": 1
        },
        "description": {
          "type": "string"
        },
        "areas": {
          "type": "array",
          "minItems": 1,
          "items": {
            "$ref": "#/$defs/AreaId"
          }
        },
        "items": {
          "type": "array",
          "items": {
            "type": "string",
            "pattern": "^[a-z]+-\\d+$"
          }
        },
        "impact": {
          "$ref": "#/$defs/Scale"
        },
        "likelihood": {
          "$ref": "#/$defs/Scale"
        },
        "band": {
          "$ref": "#/$defs/Band"
        },
        "horizon": {
          "enum": [
            "now",
            "1-3y",
            "3y+"
          ]
        },
        "kpis": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Kpi"
          }
        },
        "eur_year_low": {
          "$ref": "#/$defs/Euros"
        },
        "eur_year_high": {
          "$ref": "#/$defs/Euros"
        },
        "eur_year_expected": {
          "$ref": "#/$defs/Euros"
        },
        "eur_basis": {
          "type": "string"
        },
        "evidence": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Source"
          }
        },
        "confidence": {
          "enum": [
            "high",
            "medium",
            "low"
          ]
        }
      }
    },
    "Change": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "area",
        "action"
      ],
      "properties": {
        "area": {
          "$ref": "#/$defs/AreaId"
        },
        "action": {
          "enum": [
            "add",
            "change",
            "remove",
            "rate",
            "watch"
          ]
        },
        "item": {
          "type": "string",
          "pattern": "^[a-z]+-\\d+$"
        },
        "text": {
          "type": "string"
        },
        "from": {
          "type": [
            "number",
            "string"
          ]
        },
        "to": {
          "type": [
            "number",
            "string"
          ]
        },
        "signal": {
          "type": "string"
        },
        "trigger": {
          "type": "string"
        }
      }
    },
    "Response": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "issue",
        "kind",
        "chosen",
        "title",
        "first_step",
        "owner",
        "changes",
        "residual",
        "upside",
        "effort",
        "time_to_impact"
      ],
      "properties": {
        "id": {
          "type": "string",
          "pattern": "^R\\d+$"
        },
        "issue": {
          "type": "string",
          "pattern": "^I\\d+$"
        },
        "kind": {
          "enum": [
            "mitigate",
            "advantage",
            "accept",
            "monitor"
          ]
        },
        "chosen": {
          "type": "boolean"
        },
        "title": {
          "type": "string",
          "minLength": 1
        },
        "first_step": {
          "type": "string"
        },
        "owner": {
          "type": "string"
        },
        "changes": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Change"
          }
        },
        "residual": {
          "anyOf": [
            {
              "type": "null"
            },
            {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "impact",
                "likelihood",
                "band",
                "eur_year_low",
                "eur_year_high",
                "eur_year_expected"
              ],
              "properties": {
                "impact": {
                  "$ref": "#/$defs/Scale"
                },
                "likelihood": {
                  "$ref": "#/$defs/Scale"
                },
                "band": {
                  "$ref": "#/$defs/Band"
                },
                "eur_year_low": {
                  "$ref": "#/$defs/Euros"
                },
                "eur_year_high": {
                  "$ref": "#/$defs/Euros"
                },
                "eur_year_expected": {
                  "$ref": "#/$defs/Euros"
                }
              }
            }
          ]
        },
        "upside": {
          "anyOf": [
            {
              "type": "null"
            },
            {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "eur_year_low",
                "eur_year_high",
                "likelihood",
                "eur_year_expected"
              ],
              "properties": {
                "eur_year_low": {
                  "type": "number",
                  "minimum": 0
                },
                "eur_year_high": {
                  "type": "number",
                  "minimum": 0
                },
                "likelihood": {
                  "$ref": "#/$defs/Scale"
                },
                "eur_year_expected": {
                  "type": "number",
                  "minimum": 0
                }
              }
            }
          ]
        },
        "effort": {
          "enum": [
            "S",
            "M",
            "L"
          ]
        },
        "time_to_impact": {
          "type": "string"
        }
      }
    }
  }
};

// ---- what the agents return -------------------------------------------------------------------------
const str = (description) => ({ type: "string", description });
const int = (description) => ({ type: "integer", description });
const num = (description) => ({ type: "number", description });
const bool = (description) => ({ type: "boolean", description });
const oneOf = (values, description) => ({ type: "string", enum: values, description });
const list = (items, description) => ({ type: "array", items, description });
/** An object whose every property is required and nothing else is allowed. */
const obj = (properties, description) => ({ type: "object", description, properties, required: Object.keys(properties), additionalProperties: false });

export const OUTPUT = {
  Completion: obj({
    sector: str("The sector id from the library, or the one the person gave"),
    items: list(obj({
      block: oneOf(BLOCKS, "The block the item belongs to"),
      text: str("The item, at most 90 characters"),
      basis: str("Why this item is likely, at most 140 characters"),
      confidence: oneOf(CONFIDENCE, "How sure the agent is")
    }), "New items, at most three a block, so that every block holds at least two")
  }, "The Completer's answer"),
  Signals: obj({
    signals: list(obj({
      title: str("The title of the page found"),
      summary: str("Two sentences on what it says"),
      url: str("The address, exactly as the search returned it"),
      published: str("The date published as YYYY-MM-DD, or an empty string when unknown"),
      areas: list(oneOf(BLOCKS, "A block it touches"), "The blocks it touches")
    }), "What the search found")
  }, "The Scout's report, the input of its submit_signals tool"),
  Issues: obj({
    issues: list(obj({
      id: str("I1, I2 and on"),
      title: str("At most 80 characters"),
      type: oneOf(ISSUE_TYPES, "The kind of issue"),
      description: str("At most 300 characters"),
      blocks: list(oneOf(BLOCKS, "A block it affects"), "One to four blocks"),
      items: list(str("An item id from the canvas"), "The items it affects"),
      contradicts: str("The block or item it contradicts, in words"),
      impact: int("1 negligible to 5 threatens the model"),
      likelihood: int("1 rare to 5 almost certain, within the horizon"),
      horizon: oneOf(HORIZONS, "Now (12 months), 1 to 3 years, or more than 3 years"),
      evidence: list(str("A signal's URL, or general knowledge"), "What the issue rests on"),
      confidence: oneOf(CONFIDENCE, "How sure the agent is")
    }), "Up to eight issues, never two with the same cause")
  }, "The Red team's answer"),
  Impacts: obj({
    baselines: list(obj({
      name: str("What the agent assumed, such as containers a year"),
      value: num("Its value"),
      unit: str("Its unit"),
      basis: str("Where the value comes from")
    }), "The baselines the estimates rest on"),
    impacts: list(obj({
      issue: str("The issue id"),
      kpis: list(obj({
        id: str("A KPI id from the sector's library or general, or a new id"),
        name: str("The KPI's name"),
        unit: str("Its unit"),
        direction: oneOf(["up", "down"], "Which way the issue moves it"),
        definition: str("What it measures, for a KPI outside the library"),
        change_low: num("The smallest change, in the KPI's unit"),
        change_high: num("The largest change, in the KPI's unit"),
        basis: str("How the change was estimated")
      }), "One to three KPI effects"),
      monetisable: bool("Whether the issue can be put in euros a year"),
      eur_year_low: num("Euros a year, low end; 0 when not monetisable"),
      eur_year_high: num("Euros a year, high end; 0 when not monetisable"),
      eur_basis: str("How the range was estimated"),
      reason: str("Why it cannot be put in euros, or an empty string"),
      confidence: oneOf(CONFIDENCE, "How sure the agent is")
    }), "One entry per issue")
  }, "The Analyst's answer"),
  Responses: obj({
    responses: list(obj({
      issue: str("The issue id"),
      options: list(obj({
        kind: oneOf(["mitigate", "advantage"], "Mitigate the issue, or turn it into an advantage"),
        title: str("What to do, in a few words"),
        first_step: str("The first step"),
        owner: str("Who owns it"),
        effort: oneOf(["S", "M", "L"], "Small, medium or large"),
        time_to_impact: str("How long until it shows, such as 3-6 months"),
        changes: list(obj({
          block: oneOf(BLOCKS, "The block it changes"),
          action: oneOf(["add", "change", "remove"], "What happens to the item"),
          item: str("The item id it changes or removes, or an empty string for a new item"),
          text: str("The new text, at most 90 characters, or an empty string for a removal")
        }), "One to three changes to the canvas"),
        impact: int("Mitigate: the residual impact. Advantage: 0"),
        likelihood: int("Mitigate: the residual likelihood. Advantage: the upside's likelihood"),
        eur_year_low: num("Mitigate: the residual range's low end. Advantage: the upside's"),
        eur_year_high: num("Mitigate: the residual range's high end. Advantage: the upside's"),
        recommended: bool("Whether this is the option the agent recommends")
      }), "One or two options")
    }), "One entry per issue")
  }, "The Strategist's answer"),
  Summary: obj({
    headline: str("At most 110 characters, figures as {{fact:key}}"),
    situation: str("At most 80 words"),
    findings: list(str("A finding"), "Three findings"),
    recommendation: str("At most 80 words"),
    assumptions: list(str("An assumption to check"), "Three to five assumptions")
  }, "The Writer's answer")
};

// ---- the tool's own records ----------------------------------------------------------------------------
const Item = {
  type: "object",
  additionalProperties: false,
  required: ["id", "block", "text", "source"],
  properties: {
    id: { type: "string", pattern: ITEM_ID },
    block: { enum: BLOCKS },
    text: { type: "string", minLength: 1, maxLength: 90 },
    source: { enum: ["user", "ai"] },
    confidence: { enum: CONFIDENCE },
    basis: { type: "string", minLength: 1, maxLength: 140 }
  },
  anyOf: [
    { properties: { source: { const: "user" } } },
    { properties: { source: { const: "ai" } }, required: ["confidence", "basis"] }
  ]
};
const Company = {
  type: "object",
  additionalProperties: false,
  required: ["name", "sector", "country", "description"],
  properties: {
    name: { type: "string", minLength: 1, maxLength: 80 },
    sector: { type: "string", pattern: "^[a-z][a-z_]*$" },
    country: { type: "string", pattern: "^[A-Z]{2}$" },
    description: { type: "string", maxLength: 200 },
    size: { type: "string", maxLength: 120 },
    fictional: { type: "boolean" }
  }
};
const Canvas = {
  type: "object",
  additionalProperties: false,
  required: ["company", "blocks"],
  properties: {
    company: Company,
    blocks: {
      type: "object",
      additionalProperties: false,
      required: BLOCKS,
      properties: Object.fromEntries(BLOCKS.map((b) => [b, { type: "array", maxItems: 8, items: { $ref: "Item" } }]))
    }
  }
};
const Completion = {
  type: "object",
  additionalProperties: false,
  required: ["sector", "items"],
  properties: {
    sector: { type: "string", pattern: "^[a-z][a-z_]*$" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["block", "text", "basis", "confidence"],
        properties: {
          block: { enum: BLOCKS },
          text: { type: "string", minLength: 1, maxLength: 90 },
          basis: { type: "string", minLength: 1, maxLength: 140 },
          confidence: { enum: CONFIDENCE }
        }
      }
    }
  }
};
const Signal = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "url", "published", "areas"],
  properties: {
    title: { type: "string", minLength: 1, maxLength: 200 },
    summary: { type: "string", maxLength: 400 },
    url: { type: "string", pattern: "^https?://" },
    published: { type: "string", pattern: "^(\\d{4}-\\d{2}-\\d{2})?$" },
    areas: { type: "array", minItems: 1, items: { enum: BLOCKS } }
  }
};
const Issue = {
  type: "object",
  additionalProperties: false,
  required: ["id", "title", "type", "description", "blocks", "items", "contradicts", "impact", "likelihood", "horizon", "evidence", "confidence"],
  properties: {
    id: { type: "string", pattern: ISSUE_ID },
    title: { type: "string", minLength: 1, maxLength: 80 },
    type: { enum: ISSUE_TYPES },
    description: { type: "string", minLength: 1, maxLength: 300 },
    blocks: { type: "array", minItems: 1, maxItems: 4, items: { enum: BLOCKS } },
    items: { type: "array", items: { type: "string", pattern: ITEM_ID } },
    contradicts: { type: "string", minLength: 1 },
    impact: { type: "integer", minimum: 1, maximum: 5 },
    likelihood: { type: "integer", minimum: 1, maximum: 5 },
    horizon: { enum: HORIZONS },
    evidence: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
    confidence: { enum: CONFIDENCE }
  }
};
const Impact = {
  type: "object",
  additionalProperties: false,
  required: ["issue", "kpis", "monetisable", "eur_year_low", "eur_year_high", "eur_basis", "reason", "confidence"],
  properties: {
    issue: { type: "string", pattern: ISSUE_ID },
    kpis: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name", "unit", "direction", "definition", "change_low", "change_high", "basis"],
        properties: {
          id: { type: "string", pattern: "^[a-z][a-z_]*\\.[a-z0-9_]+$" },
          name: { type: "string", minLength: 1 },
          unit: { type: "string", minLength: 1 },
          direction: { enum: ["up", "down"] },
          definition: { type: "string" },
          change_low: { type: "number" },
          change_high: { type: "number" },
          basis: { type: "string", minLength: 1 }
        }
      }
    },
    monetisable: { type: "boolean" },
    eur_year_low: { type: "number", minimum: 0 },
    eur_year_high: { type: "number", minimum: 0 },
    eur_basis: { type: "string" },
    reason: { type: "string" },
    confidence: { enum: CONFIDENCE }
  }
};
const Option = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "title", "first_step", "owner", "effort", "time_to_impact", "changes", "impact", "likelihood", "eur_year_low", "eur_year_high", "recommended"],
  properties: {
    kind: { enum: ["mitigate", "advantage"] },
    title: { type: "string", minLength: 1, maxLength: 100 },
    first_step: { type: "string", minLength: 1, maxLength: 200 },
    owner: { type: "string", minLength: 1, maxLength: 60 },
    effort: { enum: ["S", "M", "L"] },
    time_to_impact: { type: "string", minLength: 1, maxLength: 40 },
    changes: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["block", "action", "item", "text"],
        properties: {
          block: { enum: BLOCKS },
          action: { enum: ["add", "change", "remove"] },
          item: { type: "string", pattern: "^((" + BLOCKS.join("|") + ")-\\d+)?$" },
          text: { type: "string", maxLength: 90 }
        }
      }
    },
    impact: { type: "integer", minimum: 0, maximum: 5 },
    likelihood: { type: "integer", minimum: 1, maximum: 5 },
    eur_year_low: { type: "number", minimum: 0 },
    eur_year_high: { type: "number", minimum: 0 },
    recommended: { type: "boolean" }
  }
};
const Response = {
  type: "object",
  additionalProperties: false,
  required: ["issue", "options"],
  properties: {
    issue: { type: "string", pattern: ISSUE_ID },
    options: { type: "array", minItems: 1, maxItems: 2, items: Option }
  }
};
const Decision = {
  type: "object",
  additionalProperties: false,
  required: ["issue", "choice", "option", "at", "by"],
  properties: {
    issue: { type: "string", pattern: ISSUE_ID },
    choice: { enum: ["mitigate", "advantage", "accept"] },
    option: { type: ["integer", "null"], minimum: 0, maximum: 1 },
    at: { type: "string", pattern: DATE_TIME },
    by: { const: "person" }
  }
};
const Summary = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "situation", "findings", "recommendation", "assumptions"],
  properties: {
    headline: { type: "string", minLength: 1, maxLength: 110 },
    situation: { type: "string", minLength: 1 },
    findings: { type: "array", minItems: 3, maxItems: 3, items: { type: "string", minLength: 1 } },
    recommendation: { type: "string", minLength: 1 },
    assumptions: { type: "array", minItems: 3, maxItems: 5, items: { type: "string", minLength: 1 } }
  }
};
const Answers = {
  type: "object",
  additionalProperties: false,
  required: ["completion", "signals", "issues", "impacts", "responses", "summary"],
  properties: {
    completion: { $ref: "Completion" },
    signals: { type: "array", items: { $ref: "Signal" } },
    issues: { type: "array", minItems: 1, maxItems: 8, items: { $ref: "Issue" } },
    impacts: {
      type: "object",
      additionalProperties: false,
      required: ["baselines", "impacts"],
      properties: {
        baselines: { type: "array", items: { type: "object", additionalProperties: false, required: ["name", "value", "unit", "basis"], properties: { name: { type: "string" }, value: { type: "number" }, unit: { type: "string" }, basis: { type: "string" } } } },
        impacts: { type: "array", items: { $ref: "Impact" } }
      }
    },
    responses: { type: "array", items: { $ref: "Response" } },
    summary: { $ref: "Summary" }
  }
};
const Scenario = {
  type: "object",
  additionalProperties: false,
  required: ["id", "source", "as_of", "company", "entered", "answers", "choices"],
  properties: {
    id: { enum: ["s1", "s2", "s3"] },
    source: { enum: ["authored", "recorded"] },
    as_of: { type: "string", format: "date" },
    company: Company,
    entered: { $ref: "Canvas" },
    answers: {
      type: "object",
      additionalProperties: false,
      required: ["en", "de"],
      properties: { en: Answers, de: Answers }
    },
    choices: {
      type: "object",
      additionalProperties: false,
      required: ["removed", "decisions"],
      properties: {
        removed: { type: "array", items: { type: "string" } },
        decisions: { type: "array", items: { type: "object", additionalProperties: false, required: ["issue", "choice", "option"], properties: { issue: { type: "string", pattern: ISSUE_ID }, choice: { enum: ["mitigate", "advantage", "accept"] }, option: { type: ["integer", "null"], minimum: 0, maximum: 1 } } } }
      }
    }
  }
};
const STEPS = ["start", "complete", "challenge", "assess", "adapt", "summary"];
const RunEvent = {
  type: "object",
  additionalProperties: false,
  required: ["seq", "type", "step", "data"],
  properties: {
    seq: { type: "integer", minimum: 0 },
    type: { enum: ["run_started", "step_started", "answer", "repair", "step_done", "waiting", "decided", "cost", "stopped", "finished", "error"] },
    step: { enum: [...STEPS, null] },
    data: { type: "object" }
  }
};
const AuditEvent = {
  type: "object",
  additionalProperties: false,
  required: ["at", "who", "step", "what", "detail"],
  properties: {
    at: { type: "string", pattern: DATE_TIME },
    who: { enum: ["person", "agent", "code"] },
    step: { enum: STEPS },
    what: { type: "string", minLength: 1 },
    detail: { type: "object" }
  }
};

/** The tool's records by name; js/schema.js resolves a $ref such as "Item" against this registry. */
export const CONTRACTS = { Canvas, Item, Completion, Signal, Issue, Impact, Response, Decision, Summary, Scenario, RunEvent, AuditEvent };

/** The registry of the handoff schema's own definitions, for js/schema.js. */
export const HANDOFF_DEFS = HANDOFF.$defs;
