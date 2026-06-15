import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Save, Globe, Slack, Layers, Database, Mail, Bell, 
  FileText, CheckCircle2, ChevronRight, Code, Key, Copy, Check, Info, AlertTriangle, Play, X, Settings,
  Sliders, Activity, Trash2, Plus, Edit, RefreshCw, BarChart2, Shield, ShieldAlert, Terminal, Lock
} from 'lucide-react';

interface IntegrationsProps {
  onBack: () => void;
  currentUserEmail: string;
}

export default function Integrations({ onBack, currentUserEmail }: IntegrationsProps) {
  const emailToUse = currentUserEmail || 'omp175789@gmail.com';

  // Multi-Webhooks States
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loadingWebhooks, setLoadingWebhooks] = useState<boolean>(false);
  const [deleteIdConfirm, setDeleteIdConfirm] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  
  // Active editing webhook fields
  const [editingId, setEditingId] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [webhookName, setWebhookName] = useState<string>('Production Alert Hook');
  const [webhookDesc, setWebhookDesc] = useState<string>('Delivers real-time algorithmic scan triggers');
  const [webhookStatus, setWebhookStatus] = useState<'enabled' | 'disabled'>('enabled');
  const [webhookSecret, setWebhookSecret] = useState<string>('');
  const [customHeaders, setCustomHeaders] = useState<Array<{key: string; value: string}>>([]);
  
  // Advanced Conditions list State
  const [conditions, setConditions] = useState<Array<{field: string; operator: string; value: string}>>([]);
  
  // Custom Payload structures customization
  const [payloadFields, setPayloadFields] = useState<string[]>([
    'event', 'timestamp', 'audit_id', 'module', 'bias_score', 'verdict', 'compliance', 'report_url'
  ]);
  const [fieldMappings, setFieldMappings] = useState<Array<{original: string; custom: string}>>([]);

  // Filter triggers
  const [triggers, setTriggers] = useState<string[]>(['hiring', 'dataset', 'decision']);
  const [minBiasScore, setMinBiasScore] = useState<number>(0);

  // Testing & Save feedback
  const [testing, setTesting] = useState<string | null>(null); // webhook ID being tested
  const [testResult, setTestResult] = useState<any | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Interactive documentation trace tab
  const [activeSnippetTab, setActiveSnippetTab] = useState<'curl' | 'js' | 'python'>('curl');
  const [copiedSnippet, setCopiedSnippet] = useState<boolean>(false);

  // Active connector configuration state (For Dialog popups)
  const [activeConnector, setActiveConnector] = useState<string | null>(null);
  const [slackConfig, setSlackConfig] = useState({ enabled: false, webhookUrl: '', channel: '#compliance-alerts' });
  const [sheetsConfig, setSheetsConfig] = useState({ enabled: false, spreadsheetId: '', sheetName: 'Compliance_Scans_Db' });
  const [notionConfig, setNotionConfig] = useState({ enabled: false, parentPageId: '', databaseName: 'FairAudit Global Logs' });
  const [emailConfig, setEmailConfig] = useState({ enabled: false, recipientEmails: 'compliance@yourfirm.com' });
  const [firewallConfig, setFirewallConfig] = useState({
    enabled: false,
    blocklistIps: '',
    blocklistUserAgents: '',
    maxRequestsPerMin: 120,
    rateLimitByIp: true,
    detectSqlInjection: true,
    forceStrictApiKey: false,
    underAttackMode: false
  });
  const [firewallLogs, setFirewallLogs] = useState<any[]>([]);
  const [loadingFirewallLogs, setLoadingFirewallLogs] = useState<boolean>(false);
  const [connectorTestStatus, setConnectorTestStatus] = useState<string | null>(null);

  // Available standard templates
  const templates = [
    {
      id: 'slack',
      name: 'Slack Channel Alerts',
      desc: 'Formulate Slack notification payload on critical bias failures.',
      url: 'https://hooks.slack.com/services/T00/B00/X00',
      triggers: ['hiring', 'dataset', 'decision'],
      minScore: 70,
      headers: [{ key: 'X-Webhook-Source', value: 'FairAudit-Slack-Bot' }],
      conditions: [{ field: 'bias_score', operator: '>', value: '70' }],
      fields: ['event', 'timestamp', 'bias_score', 'verdict', 'report_url'],
      mapping: [{ original: 'bias_score', custom: 'overall_score' }, { original: 'verdict', custom: 'verdict_assessment' }]
    },
    {
      id: 'sheets',
      name: 'Google Sheets DB Syncer',
      desc: 'Perfect spreadsheet layout with specific properties subset.',
      url: 'https://script.google.com/macros/s/AKfycb/exec',
      triggers: ['hiring', 'dataset', 'decision'],
      minScore: 0,
      headers: [{ key: 'X-Integrator-Key', value: 'google-sheets-secret' }],
      conditions: [],
      fields: ['timestamp', 'audit_id', 'module', 'bias_score', 'verdict'],
      mapping: [{ original: 'audit_id', custom: 'record_row_id' }]
    },
    {
      id: 'notion',
      name: 'Notion Compliance Database',
      desc: 'Auto-document recommendations checklist properties.',
      url: 'https://api.notion.com/v1/pages',
      triggers: ['dataset', 'decision'],
      minScore: 40,
      headers: [
        { key: 'Authorization', value: 'Bearer secret_notion_key' },
        { key: 'Notion-Version', value: '2022-06-28' }
      ],
      conditions: [],
      fields: ['timestamp', 'module', 'bias_score', 'recommendations'],
      mapping: [{ original: 'recommendations', custom: 'compliance_actionables' }]
    }
  ];

  // Fetch webhooks on mount and listen to real-time updates
  useEffect(() => {
    fetchWebhooksList();
    loadEnterpriseConfigs();
    fetchEnterpriseLogs();

    const handleWebhooksSync = () => {
      fetchWebhooksList();
    };

    const handleEnterpriseSync = () => {
      loadEnterpriseConfigs();
      fetchEnterpriseLogs();
    };

    window.addEventListener('webhooks_updated', handleWebhooksSync);
    window.addEventListener('enterprise_updated', handleEnterpriseSync);

    return () => {
      window.removeEventListener('webhooks_updated', handleWebhooksSync);
      window.removeEventListener('enterprise_updated', handleEnterpriseSync);
    };
  }, [currentUserEmail]);

  // Poll Firewall attack logs in real-time when the Firewall controller is active
  useEffect(() => {
    let interval: any;
    if (activeConnector === 'firewall') {
      fetchFirewallLogs();
      interval = setInterval(fetchFirewallLogs, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeConnector]);

  const fetchWebhooksList = async () => {
    setLoadingWebhooks(true);
    try {
      const r = await fetch(`/api/v1/webhooks?email=${encodeURIComponent(emailToUse)}`);
      const body = await r.json();
      if (body.success && body.webhooks) {
        setWebhooks(body.webhooks);
      }
    } catch (err) {
      console.warn("Failed fetching back-end webhooks console list:", err);
    } finally {
      setLoadingWebhooks(false);
    }
  };

  const fetchFirewallLogs = async () => {
    setLoadingFirewallLogs(true);
    try {
      const res = await fetch("/api/v1/firewall/logs");
      const data = await res.json();
      if (data.success && data.logs) {
        setFirewallLogs(data.logs);
      }
    } catch (e) {
      console.warn("Could not fetch firewall logs:", e);
    } finally {
      setLoadingFirewallLogs(false);
    }
  };

  const clearFirewallLogs = async () => {
    try {
      await fetch("/api/v1/firewall/logs/clear", { method: "POST" });
      setFirewallLogs([]);
    } catch (e) {
      console.error("Could not clear firewall logs:", e);
    }
  };

  const loadEnterpriseConfigs = () => {
    // Load local storage first
    const sl = localStorage.getItem('fairaudit_slack_config');
    if (sl) setSlackConfig(JSON.parse(sl));

    const sh = localStorage.getItem('fairaudit_sheets_config');
    if (sh) setSheetsConfig(JSON.parse(sh));

    const no = localStorage.getItem('fairaudit_notion_config');
    if (no) setNotionConfig(JSON.parse(no));

    const em = localStorage.getItem('fairaudit_email_config');
    if (em) setEmailConfig(JSON.parse(em));

    const fw = localStorage.getItem('fairaudit_firewall_config');
    if (fw) setFirewallConfig(JSON.parse(fw));

    // Pull from remote and merge
    fetch(`/api/settings/enterprise?email=${encodeURIComponent(emailToUse)}`)
      .then(r => r.json())
      .then(enterpriseData => {
        if (enterpriseData) {
          if (enterpriseData.slack) {
            setSlackConfig(enterpriseData.slack);
            localStorage.setItem('fairaudit_slack_config', JSON.stringify(enterpriseData.slack));
          }
          if (enterpriseData.sheets) {
            setSheetsConfig(enterpriseData.sheets);
            localStorage.setItem('fairaudit_sheets_config', JSON.stringify(enterpriseData.sheets));
          }
          if (enterpriseData.notion) {
            setNotionConfig(enterpriseData.notion);
            localStorage.setItem('fairaudit_notion_config', JSON.stringify(enterpriseData.notion));
          }
          if (enterpriseData.emailConfig) {
            setEmailConfig(enterpriseData.emailConfig);
            localStorage.setItem('fairaudit_email_config', JSON.stringify(enterpriseData.emailConfig));
          }
          if (enterpriseData.firewall) {
            setFirewallConfig(enterpriseData.firewall);
            localStorage.setItem('fairaudit_firewall_config', JSON.stringify(enterpriseData.firewall));
          }
        }
      })
      .catch(e => console.warn("Failed syncing enterprise config:", e));
  };

  // --- DIRECT CONNECTION LOGIC (Google login style) ---
  const [activeDirectAuth, setActiveDirectAuth] = useState<'google' | 'notion' | 'email' | 'firewall' | null>(null);
  const [authStage, setAuthStage] = useState<'consent' | 'authorizing' | 'success'>('consent');
  const [authStepText, setAuthStepText] = useState('');
  
  const [sheetsLogs, setSheetsLogs] = useState<any[]>([]);
  const [notionLogs, setNotionLogs] = useState<any[]>([]);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchEnterpriseLogs = async () => {
    setLoadingLogs(true);
    try {
      const emailParam = encodeURIComponent(emailToUse);
      const [resSheets, resNotion, resEmail] = await Promise.all([
        fetch(`/api/settings/enterprise/sheets?email=${emailParam}`).then(r => r.json()),
        fetch(`/api/settings/enterprise/notion?email=${emailParam}`).then(r => r.json()),
        fetch(`/api/settings/enterprise/email?email=${emailParam}`).then(r => r.json())
      ]);
      if (resSheets.success) setSheetsLogs(resSheets.logs || []);
      if (resNotion.success) setNotionLogs(resNotion.logs || []);
      if (resEmail.success) setEmailLogs(resEmail.logs || []);
    } catch (e) {
      console.warn("Failed retrieving enterprise logs:", e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleStartDirectConnect = (service: 'google' | 'notion' | 'email' | 'firewall') => {
    setActiveDirectAuth(service);
    setAuthStage('consent');
    setAuthStepText('');
  };

  const handleConfirmDirectConnect = async (service: 'google' | 'notion' | 'email' | 'firewall') => {
    setAuthStage('authorizing');
    
    // Simulate beautiful multi-phase OAuth authorization steps
    setAuthStepText("Exchanging OAuth code for securely signed JWT credentials...");
    await new Promise(r => setTimeout(r, 600));
    setAuthStepText("Handshaking with API endpoint and establishing compliance sandbox...");
    await new Promise(r => setTimeout(r, 600));
    setAuthStepText("Creating default database collection and seeding testing index schema...");
    await new Promise(r => setTimeout(r, 600));
    
    let updatedSlack = slackConfig;
    let updatedSheets = sheetsConfig;
    let updatedNotion = notionConfig;
    let updatedEmail = emailConfig;
    let updatedFirewall = firewallConfig;

    if (service === 'google') {
      updatedSheets = {
        enabled: true,
        spreadsheetId: "1sp_google_sheets_" + Math.random().toString(36).substring(2, 7) + "_omp",
        sheetName: "FairAudit_Realtime_Insights"
      };
      setSheetsConfig(updatedSheets);
      localStorage.setItem('fairaudit_sheets_config', JSON.stringify(updatedSheets));
    } else if (service === 'notion') {
      updatedNotion = {
        enabled: true,
        parentPageId: "notion_parent_page_" + Math.random().toString(36).substring(2, 7),
        databaseName: "FairAudit Global Compliance Board"
      };
      setNotionConfig(updatedNotion);
      localStorage.setItem('fairaudit_notion_config', JSON.stringify(updatedNotion));
    } else if (service === 'email') {
      updatedEmail = {
        enabled: true,
        recipientEmails: emailToUse
      };
      setEmailConfig(updatedEmail);
      localStorage.setItem('fairaudit_email_config', JSON.stringify(updatedEmail));
    } else if (service === 'firewall') {
      updatedFirewall = {
        enabled: true,
        blocklistIps: "185.220.101.4, 45.148.10.12",
        blocklistUserAgents: "scrapbot, headless",
        maxRequestsPerMin: 60,
        rateLimitByIp: true,
        detectSqlInjection: true,
        forceStrictApiKey: false,
        underAttackMode: false
      };
      setFirewallConfig(updatedFirewall);
      localStorage.setItem('fairaudit_firewall_config', JSON.stringify(updatedFirewall));
    }

    try {
      // Save configuration on server
      await fetch("/api/settings/enterprise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailToUse,
          slack: updatedSlack,
          sheets: updatedSheets,
          notion: updatedNotion,
          emailConfig: updatedEmail,
          firewall: updatedFirewall
        })
      });

      // Seed initial sample compliance records so user sees them immediately!
      await fetch("/api/settings/enterprise/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToUse, type: service === 'google' ? 'sheets' : service })
      });

      // Refresh logs
      await fetchEnterpriseLogs();
      if (service === 'firewall') {
        await fetchFirewallLogs();
      }

      setAuthStage('success');
      setTimeout(() => {
        setActiveDirectAuth(null);
        // Automatically open the corresponding integration card or refresh!
        window.dispatchEvent(new Event('enterprise_updated'));
      }, 1200);

    } catch (e) {
      console.error("Direct connection save/seed failed:", e);
      setAuthStage('consent');
      alert("Handshake error contacting authorization servers. Please try again.");
    }
  };

  // Webhooks mutations
  const handleAddNewWebhook = () => {
    setEditingId(null);
    setWebhookName('Production Alert Hook');
    setWebhookDesc('Delivers real-time algorithmic scan triggers');
    setWebhookUrl('');
    setWebhookStatus('enabled');
    setWebhookSecret('');
    setCustomHeaders([{ key: 'Authorization', value: 'Bearer fa_secret_token_123' }]);
    setConditions([]);
    setPayloadFields(['event', 'timestamp', 'audit_id', 'module', 'bias_score', 'verdict', 'compliance', 'report_url']);
    setFieldMappings([]);
    setTriggers(['hiring', 'dataset', 'decision']);
    setMinBiasScore(0);
    setTestResult(null);
    setIsEditing(true);
  };

  const handleEditWebhook = (webhook: any) => {
    setEditingId(webhook.id);
    setWebhookName(webhook.name || 'Production Alert Hook');
    setWebhookDesc(webhook.description || '');
    setWebhookUrl(webhook.webhookUrl || '');
    setWebhookStatus(webhook.status || 'enabled');
    setWebhookSecret(webhook.secretToken || '');
    
    // Headers
    setCustomHeaders(webhook.customHeaders || []);
    
    // Triggers / Conditions
    const triggersList = webhook.triggers?.modules || ['hiring', 'dataset', 'decision'];
    setTriggers(triggersList);
    setMinBiasScore(webhook.triggers?.min_bias_score !== undefined ? webhook.triggers.min_bias_score : 0);
    
    setConditions(webhook.conditions || []);

    // Payloads config
    setPayloadFields(webhook.payload_fields && webhook.payload_fields.length > 0 ? webhook.payload_fields : [
      'event', 'timestamp', 'audit_id', 'module', 'bias_score', 'verdict', 'compliance', 'report_url'
    ]);

    // Fields mappings
    const mappingsList: Array<{original: string; custom: string}> = [];
    if (webhook.field_mapping && typeof webhook.field_mapping === "object") {
      Object.entries(webhook.field_mapping).forEach(([orig, cust]) => {
        mappingsList.push({ original: orig, custom: String(cust) });
      });
    }
    setFieldMappings(mappingsList);

    setTestResult(null);
    setIsEditing(true);
  };

  const handleApplyTemplate = (tpl: any) => {
    setWebhookName(tpl.name);
    setWebhookDesc(tpl.desc);
    setWebhookUrl(tpl.url);
    setTriggers(tpl.triggers);
    setMinBiasScore(tpl.minScore);
    setCustomHeaders(tpl.headers);
    setConditions(tpl.conditions);
    setPayloadFields(tpl.fields);
    setFieldMappings(tpl.mapping);
  };

  // Conditions helpers
  const handleAddCondition = () => {
    setConditions([...conditions, { field: 'bias_score', operator: '>', value: '70' }]);
  };

  const handleRemoveCondition = (idx: number) => {
    setConditions(conditions.filter((_, i) => i !== idx));
  };

  const handleEditCondition = (idx: number, key: string, value: string) => {
    const next = [...conditions];
    (next[idx] as any)[key] = value;
    setConditions(next);
  };

  // Re-mappings helpers
  const handleAddMapping = () => {
    setFieldMappings([...fieldMappings, { original: 'bias_score', custom: 'overall_score' }]);
  };

  const handleRemoveMapping = (idx: number) => {
    setFieldMappings(fieldMappings.filter((_, i) => i !== idx));
  };

  const handleEditMapping = (idx: number, orig: string, cust: string) => {
    const next = [...fieldMappings];
    next[idx] = { original: orig, custom: cust };
    setFieldMappings(next);
  };

  // Toggle checklist payloads
  const handleTogglePayloadField = (field: string) => {
    if (payloadFields.includes(field)) {
      setPayloadFields(payloadFields.filter(f => f !== field));
    } else {
      setPayloadFields([...payloadFields, field]);
    }
  };

  // Save Webhook Config to server
  const saveWebhook = async () => {
    if (!webhookUrl) {
      alert("Please specify a target Webhook Endpoint URL.");
      return;
    }
    setSaving(true);
    setSaveStatus('saving');

    // Assemble field remappings back to object block
    const mappingsObj: Record<string, string> = {};
    fieldMappings.forEach(m => {
      if (m.original.trim() && m.custom.trim()) {
        mappingsObj[m.original] = m.custom;
      }
    });

    const parsedTriggers = {
      modules: triggers,
      min_bias_score: minBiasScore,
      max_bias_score: 100,
      verdicts: ["FAIR", "POTENTIALLY_BIASED", "BIASED"],
      compliance: ["COMPLIANT", "NON_COMPLIANT", "REVIEW_NEEDED"]
    };

    const targetId = editingId || "wh_" + Math.random().toString(36).substring(2, 8);

    const optimisticWebhook = {
      id: targetId,
      name: webhookName,
      description: webhookDesc,
      webhookUrl,
      status: webhookStatus,
      secretToken: webhookSecret,
      triggers: parsedTriggers,
      conditions: conditions,
      payload_fields: payloadFields,
      field_mapping: mappingsObj,
      customHeaders: customHeaders,
      lastTriggered: null,
      lastTriggerStatus: null
    };

    const backupList = [...webhooks];

    // Optimistically update the list for real-time smoothness
    setWebhooks(prev => {
      const exists = prev.some(w => w.id === editingId);
      if (exists) {
        return prev.map(w => w.id === editingId ? { ...w, ...optimisticWebhook } : w);
      } else {
        return [...prev, optimisticWebhook];
      }
    });

    try {
      const response = await fetch("/api/v1/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailToUse,
          webhookId: editingId,
          name: webhookName,
          webhookUrl,
          status: webhookStatus,
          secretToken: webhookSecret,
          triggers: parsedTriggers,
          conditions: conditions,
          payload_fields: payloadFields,
          field_mapping: mappingsObj,
          customHeaders: customHeaders
        })
      });
      const data = await response.json();
      if (data.success) {
        if (data.webhook) {
          setWebhooks(prev => {
            const listWithoutTemp = prev.filter(w => w.id !== targetId && w.id !== editingId);
            return [...listWithoutTemp, data.webhook];
          });
        }
        setSaveStatus('saved');
        setTimeout(() => {
          setSaveStatus('idle');
          setIsEditing(false);
          fetchWebhooksList();
          window.dispatchEvent(new Event('webhooks_updated'));
        }, 1000);
      } else {
        // Rollback
        setWebhooks(backupList);
      }
    } catch (err) {
      console.error("Failed saving webhook:", err);
      setSaveStatus('idle');
      setWebhooks(backupList);
    } finally {
      setSaving(false);
    }
  };

  // Delete Webhook key
  const handleDeleteWebhook = async (webhookId: string) => {
    // Instant real-time UI removal animation (Optimistic update)
    const backupList = [...webhooks];
    setWebhooks(prev => prev.filter(w => w.id !== webhookId));

    try {
      const res = await fetch(`/api/v1/webhooks/${webhookId}?email=${encodeURIComponent(emailToUse)}`, {
        method: "DELETE"
      });
      if (!res.ok) {
        setWebhooks(backupList);
      } else {
        // Soft reload to keep log histories and dynamic states exact
        fetchWebhooksList();
        window.dispatchEvent(new Event('webhooks_updated'));
      }
    } catch (err) {
      console.error("Webhook removal failed:", err);
      setWebhooks(backupList);
    }
  };

  // Interactive Test trigger dispatch via API
  const testWebhookDeliveryById = async (webhookId: string) => {
    setTesting(webhookId);
    setTestResult(null);
    try {
      const res = await fetch(`/api/v1/webhooks/${webhookId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToUse })
      });
      const body = await res.json();
      setTestResult({
        success: body.success,
        webhookId,
        statusCode: body.status_code || 200,
        latency: body.duration_ms || 120,
        message: body.success ? `Delivered successfully! Host returned code ${body.status_code || 200}` : (body.logs_message || 'Dispatch timeout'),
        sentPayload: body.payload_dispatched
      });
    } catch (ex: any) {
      setTestResult({
        success: false,
        webhookId,
        message: ex.message || "Failed test delivery sequence."
      });
    } finally {
      setTesting(null);
    }
  };

  // Outbound sample code rendering
  const getSnippetCode = () => {
    const targetUrl = webhookUrl || 'https://yourserver.com/webhook-endpoint';
    const headersHeader = customHeaders
      .filter(h => h.key.trim())
      .map(h => `  -H "${h.key}: ${h.value}"`)
      .join(" \\\n");

    const headersJs = customHeaders
      .filter(h => h.key.trim())
      .map(h => `      "${h.key}": "${h.value}"`)
      .join(",\n");

    const headersPy = customHeaders
      .filter(h => h.key.trim())
      .map(h => `    "${h.key}": "${h.value}"`)
      .join(",\n");

    if (activeSnippetTab === 'curl') {
      return `curl -X POST "${targetUrl}" \\\n  -H "Content-Type: application/json" \\\n${headersHeader ? headersHeader + " \\\n" : "" }  -d '{\n    "event": "audit_complete",\n    "timestamp": "${new Date().toISOString()}",\n    "audit_id": "aud_8892h83f",\n    "module": "resume_screening",\n    "bias_score": 74,\n    "verdict": "POTENTIALLY_BIASED",\n    "flagged": ["gender", "age"],\n    "compliance": {\n      "eeoc": "NON_COMPLIANT",\n      "eu_ai_act": "REVIEW_NEEDED"\n    }\n  }'`;
    }
    if (activeSnippetTab === 'js') {
      return `fetch("${targetUrl}", {\n  method: "POST",\n  headers: {\n    "Content-Type": "application/json",\n${headersJs ? headersJs + "\n" : ""}\n  },\n  body: JSON.stringify({\n    event: "audit_complete",\n    timestamp: "${new Date().toISOString()}",\n    audit_id: "aud_8892h83f",\n    module: "resume_screening",\n    bias_score": 74,\n    verdict: "POTENTIALLY_BIASED"\n  })\n})\n.then(res => console.log("Webhook acknowledged:", res.status));`;
    }
    return `import requests\nimport json\n\nurl = "${targetUrl}"\nheaders = {\n    "Content-Type": "application/json",\n${headersPy ? headersPy + "\n" : ""}\n}\npayload = {\n    "event": "audit_complete",\n    "module": "resume_screening",\n    "bias_score": 74,\n    "verdict": "POTENTIALLY_BIASED"\n}\n\nresponse = requests.post(url, data=json.dumps(payload), headers=headers)\nprint(f"Status: {response.status_code}")`;
  };

  const copySnippetToClipboard = () => {
    navigator.clipboard.writeText(getSnippetCode());
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const testEnterpriseConnector = (connectorId: string) => {
    setConnectorTestStatus("executing");
    setTimeout(() => {
      setConnectorTestStatus("success");
      setTimeout(() => setConnectorTestStatus(null), 3000);
    }, 1200);
  };

  const toggleConnectorStatus = async (type: string) => {
    let s = slackConfig;
    let sh = sheetsConfig;
    let n = notionConfig;
    let e = emailConfig;

    if (type === 'slack') {
      s = { ...slackConfig, enabled: !slackConfig.enabled };
      setSlackConfig(s);
      localStorage.setItem('fairaudit_slack_config', JSON.stringify(s));
    }
    if (type === 'sheets') {
      sh = { ...sheetsConfig, enabled: !sheetsConfig.enabled };
      setSheetsConfig(sh);
      localStorage.setItem('fairaudit_sheets_config', JSON.stringify(sh));
    }
    if (type === 'notion') {
      n = { ...notionConfig, enabled: !notionConfig.enabled };
      setNotionConfig(n);
      localStorage.setItem('fairaudit_notion_config', JSON.stringify(n));
    }
    if (type === 'email') {
      e = { ...emailConfig, enabled: !emailConfig.enabled };
      setEmailConfig(e);
      localStorage.setItem('fairaudit_email_config', JSON.stringify(e));
    }

    try {
      await fetch("/api/settings/enterprise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailToUse,
          slack: s,
          sheets: sh,
          notion: n,
          emailConfig: e
        })
      });
      window.dispatchEvent(new Event('enterprise_updated'));
    } catch (err) {
      console.error("Failed toggling enterprise status on server:", err);
    }
  };

  const saveConnectorForm = async (type: string) => {
    let s = slackConfig;
    let sh = sheetsConfig;
    let n = notionConfig;
    let e = emailConfig;
    let fw = firewallConfig;

    if (type === 'slack') {
      s = { ...slackConfig, enabled: true };
      setSlackConfig(s);
      localStorage.setItem('fairaudit_slack_config', JSON.stringify(s));
    }
    if (type === 'sheets') {
      sh = { ...sheetsConfig, enabled: true };
      setSheetsConfig(sh);
      localStorage.setItem('fairaudit_sheets_config', JSON.stringify(sh));
    }
    if (type === 'notion') {
      n = { ...notionConfig, enabled: true };
      setNotionConfig(n);
      localStorage.setItem('fairaudit_notion_config', JSON.stringify(n));
    }
    if (type === 'email') {
      e = { ...emailConfig, enabled: true };
      setEmailConfig(e);
      localStorage.setItem('fairaudit_email_config', JSON.stringify(e));
    }
    if (type === 'firewall') {
      fw = { ...firewallConfig, enabled: true };
      setFirewallConfig(fw);
      localStorage.setItem('fairaudit_firewall_config', JSON.stringify(fw));
    }

    try {
      await fetch("/api/settings/enterprise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailToUse,
          slack: s,
          sheets: sh,
          notion: n,
          emailConfig: e,
          firewall: fw
        })
      });
      window.dispatchEvent(new Event('enterprise_updated'));
    } catch (err) {
      console.error("Failed saving enterprise config to server:", err);
    }
    setActiveConnector(null);
  };

  const disconnectConnectorAndClear = async (type: string) => {
    let s = slackConfig;
    let sh = sheetsConfig;
    let n = notionConfig;
    let e = emailConfig;
    let fw = firewallConfig;

    if (type === 'slack') {
      s = { ...slackConfig, enabled: false, webhookUrl: '' };
      setSlackConfig(s);
      localStorage.setItem('fairaudit_slack_config', JSON.stringify(s));
    }
    if (type === 'sheets') {
      sh = { ...sheetsConfig, enabled: false, spreadsheetId: '' };
      setSheetsConfig(sh);
      localStorage.setItem('fairaudit_sheets_config', JSON.stringify(sh));
    }
    if (type === 'notion') {
      n = { ...notionConfig, enabled: false, parentPageId: '' };
      setNotionConfig(n);
      localStorage.setItem('fairaudit_notion_config', JSON.stringify(n));
    }
    if (type === 'email') {
      e = { ...emailConfig, enabled: false, recipientEmails: '' };
      setEmailConfig(e);
      localStorage.setItem('fairaudit_email_config', JSON.stringify(e));
    }
    if (type === 'firewall') {
      fw = { ...firewallConfig, enabled: false };
      setFirewallConfig(fw);
      localStorage.setItem('fairaudit_firewall_config', JSON.stringify(fw));
    }

    try {
      await fetch("/api/settings/enterprise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailToUse,
          slack: s,
          sheets: sh,
          notion: n,
          emailConfig: e,
          firewall: fw
        })
      });
      window.dispatchEvent(new Event('enterprise_updated'));
    } catch (err) {
      console.error("Failed disconnecting connection state:", err);
    }
  };

  const integrationCards = [
    {
      id: "slack",
      name: "Slack Notifications",
      description: "Post instantaneous alerts inside channels whenever high-risk bias criteria or EU violation markers trigger.",
      icon: <Slack className="w-8 h-8 text-pink-500" />,
      connected: slackConfig.enabled,
      detailsText: `Channel: ${slackConfig.channel || '#compliance-alerts'}`
    },
    {
      id: "sheets",
      name: "Google Sheets Sync",
      description: "Instantly append audit rows and compliance verdicts directly to an active shared spreadsheet database.",
      icon: <Database className="w-8 h-8 text-emerald-500" />,
      connected: sheetsConfig.enabled,
      detailsText: `Worksheet: ${sheetsConfig.sheetName || 'Compliance_Scans_Db'}`
    },
    {
      id: "notion",
      name: "Notion Knowledge Workspace",
      description: "Auto-document bias audits and export recommendation checklists directly into compliance folders.",
      icon: <FileText className="w-8 h-8 text-amber-500" />,
      connected: notionConfig.enabled,
      detailsText: `Database: ${notionConfig.databaseName || 'FairAudit Logs'}`
    },
    {
      id: "email",
      name: "Email Alert Digests",
      description: "Deliver scheduled compliance audit summaries and statistics reports to management stakeholders.",
      icon: <Mail className="w-8 h-8 text-blue-500" />,
      connected: emailConfig.enabled,
      detailsText: `Recipients: ${emailConfig.recipientEmails || 'management@firm.com'}`
    },
    {
      id: "firewall",
      name: "API Firewall & DoS Shield",
      description: "Activate sliding IP rate-limits, block list IPs, and filter SQL/XSS exploit payloads dynamically.",
      icon: <Shield className="w-8 h-8 text-[#5046e5]" />,
      connected: firewallConfig.enabled,
      detailsText: `Limit: ${firewallConfig.maxRequestsPerMin} req/min | DoS: ${firewallConfig.underAttackMode ? 'ACTIVE' : 'Shielded'}`
    }
  ];

  // Dynamic statistics calculations to avoid fake or static placeholders
  const allLogs = (webhooks || []).flatMap(wh => wh.logs || []);

  // 1. Success Rate
  let successRateText = "100.0%";
  let successRateSub = "No delivery runs yet";
  if (allLogs.length > 0) {
    const successCount = allLogs.filter(l => l.success).length;
    const rate = (successCount / allLogs.length) * 100;
    successRateText = `${rate.toFixed(1)}%`;
    successRateSub = `✓ Across last ${allLogs.length} outbound calls`;
  }

  // 2. Avg Latency Response
  let avgLatencyText = "--- ms";
  let avgLatencySub = "No delivery stats yet";
  if (allLogs.length > 0) {
    const totalDuration = allLogs.reduce((sum, l) => sum + (Number(l.duration) || 0), 0);
    const avg = Math.round(totalDuration / allLogs.length);
    avgLatencyText = `${avg} ms`;
    avgLatencySub = "Fast network handshakes";
  }

  // 3. Traffic volume trend (Grouped by the last 7 calendar days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const dailyCounts = last7Days.map(dateStr => {
    return allLogs.filter(l => l.timestamp && l.timestamp.startsWith(dateStr)).length;
  });

  const maxDailyCount = Math.max(...dailyCounts, 1);

  // Set up uncropped, clean drawing coordinates for the mini-chart svg (viewBox width 100, height 40)
  const chartHeight = 40;
  const paddingY = 6;
  const activeHeight = chartHeight - paddingY * 2; // 28px of drawable height
  
  const points = dailyCounts.map((count, idx) => {
    const x = 4 + (idx / 6) * 92;
    const ratio = count / maxDailyCount;
    const y = chartHeight - paddingY - (ratio * activeHeight);
    return { x, y, count };
  });

  // Create SVG path string
  const linePathD = points.map((p, idx) => {
    return (idx === 0 ? 'M' : 'L') + ` ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }).join(' ');

  // Create closed coordinates path for the gradient background fill (reaches down to baseline 39)
  const fillPathD = points.length > 0 ? (
    `${linePathD} L ${points[points.length - 1].x.toFixed(1)} 39 L ${points[0].x.toFixed(1)} 39 Z`
  ) : '';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Return Action Header */}
      <div className="flex items-center gap-2 mb-6">
        <button 
          onClick={onBack}
          className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/60 rounded-xl text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-bold font-display cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm mb-8">
        <div className="border-b border-slate-150 dark:border-slate-800 pb-6 mb-6">
          <span className="text-[10px] font-black tracking-widest text-[#6366f1] uppercase block mb-1">Integrations Hub</span>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none font-display">System Connections</h2>
          <p className="text-slate-500 font-medium text-sm mt-2">
            Configure dynamic developers webhooks, custom schemas payload field mappings, and enterprise application pipelines.
          </p>
        </div>

        {/* 2A. MULTIPLE WEBHOOK MANAGEMENT LIST PANEL VIEW */}
        <AnimatePresence mode="wait">
          {!isEditing ? (
            <motion.div
              key="list-panel"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="space-y-6 pb-4"
            >
            
            {/* Live Analytics Mini Panel */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-[#5046e5]/5 dark:bg-[#5046e5]/10 p-5 rounded-2xl border border-[#5046e5]/20">
                <span className="text-[10px] font-bold text-indigo-400 block uppercase">Webhook Success Rate</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{successRateText}</div>
                <div className="text-[10px] text-slate-400 font-semibold mt-1">{successRateSub}</div>
              </div>
              <div className="bg-slate-55 dark:bg-slate-950 p-5 rounded-2xl border border-slate-150 dark:border-slate-850">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">Active Endpoints</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{webhooks.length} <span className="text-xs font-semibold text-slate-400">/ 5 limit</span></div>
                <div className="text-[10px] text-slate-400 font-semibold mt-1">
                  {webhooks.filter((w: any) => w.status === 'enabled').length} active configured streams
                </div>
              </div>
              <div className="bg-slate-55 dark:bg-slate-950 p-5 rounded-2xl border border-slate-150 dark:border-slate-850">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Avg Latency Response</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{avgLatencyText}</div>
                <div className="text-[10px] text-slate-400 font-semibold mt-1">{avgLatencySub}</div>
              </div>
              
              {/* Native SVG visual mini graph */}
              <div className="bg-slate-55 dark:bg-slate-950 p-5 rounded-2xl border border-slate-150 dark:border-slate-850 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase leading-none">Traffic Volume trend</span>
                  <span className="text-[9px] font-black font-mono text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded leading-none">
                    {allLogs.length} triggers
                  </span>
                </div>
                <div className="h-[40px] w-full mt-2 relative overflow-visible">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="miniTrendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {fillPathD && (
                      <path
                        d={fillPathD}
                        fill="url(#miniTrendGrad)"
                      />
                    )}
                    <path
                      d={linePathD}
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="text-[9px] font-bold text-slate-400 mt-1">Real-time daily triggers history</span>
              </div>
            </div>

            {/* List Table Headers */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-indigo-550" /> Webhook Endpoints ({webhooks.length})
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Register up to 5 concurrent target services to receive automated JSON reports.</p>
              </div>
              <button 
                onClick={handleAddNewWebhook}
                disabled={webhooks.length >= 5}
                className="bg-[#6366f1] hover:bg-[#4f46e5] text-white text-xs font-black py-2.5 px-4 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> Register Webhook
              </button>
            </div>

            {/* Table layout of multiple webhooks */}
            {loadingWebhooks ? (
              <div className="py-20 text-center text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                <span className="text-xs font-semibold">Retrieving your webhook endpoints...</span>
              </div>
            ) : webhooks.length === 0 ? (
              <div className="bg-slate-55 dark:bg-slate-950/20 rounded-2xl p-10 border border-dashed border-slate-150 dark:border-slate-800 text-center">
                <Globe className="w-10 h-10 mx-auto text-slate-350 dark:text-slate-600 stroke-1 mb-3" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-300">No Webhook Endpoints Configured</h4>
                <p className="text-xs text-slate-505 leading-relaxed font-semibold mt-1 max-w-sm mx-auto">
                  Automate compliance pipelines by registering secure HTTPS endpoints. Link Slack, custom DB caches, or microservices seamlessly.
                </p>
                <button 
                  onClick={handleAddNewWebhook}
                  className="bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-bold py-2 px-3 rounded-lg mt-4 cursor-pointer"
                >
                  Create Your First Webhook
                </button>
              </div>
            ) : (
              <div className="bg-slate-55 dark:bg-slate-950 rounded-2xl border border-slate-150 dark:border-slate-850 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-extrabold uppercase text-[9px] tracking-wider bg-slate-100/50 dark:bg-slate-900/50">
                        <th className="py-3 px-4">Endpoint Name</th>
                        <th className="py-3 px-4">Target URL</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Triggers</th>
                        <th className="py-3 px-4">Last Handshake</th>
                        <th className="py-3 px-4 text-center font-bold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 dark:divide-slate-900/40 text-slate-700 dark:text-slate-300 font-semibold mb-2">
                      <AnimatePresence initial={false}>
                        {webhooks.map((wh) => (
                          <motion.tr 
                            key={wh.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.2 }}
                            layout
                            className="hover:bg-slate-100/30 dark:hover:bg-slate-900/30 border-b border-slate-150 dark:border-slate-900/40"
                          >
                          <td className="py-4 px-4">
                            <span className="font-extrabold text-slate-900 dark:text-white block">{wh.name}</span>
                            <span className="text-[10px] text-slate-400 font-semibold block">{wh.description || 'No description provided'}</span>
                          </td>
                          <td className="py-4 px-4 font-mono text-[10px] text-slate-500 max-w-[200px] truncate" title={wh.webhookUrl}>
                            {wh.webhookUrl}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              wh.status === 'Failing' 
                                ? 'bg-red-50 dark:bg-red-950/40 text-red-655' 
                                : wh.status === 'disabled' 
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' 
                                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
                            }`}>
                              {wh.status === 'Failing' ? '🚨 Failing' : wh.status === 'disabled' ? '⏹ Disabled' : '● Active'}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex flex-wrap gap-1">
                              {(wh.triggers?.modules || []).map((m: string) => (
                                <span key={m} className="bg-slate-200 dark:bg-slate-800 text-[9px] font-black uppercase text-slate-500 tracking-wider px-1.5 py-0.5 rounded">
                                  {m}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {wh.lastTriggered ? (
                              <div>
                                <span className="text-[10px] font-mono text-slate-500 block">{new Date(wh.lastTriggered).toLocaleString()}</span>
                                <span className={`text-[9px] block uppercase font-bold ${wh.lastTriggerStatus === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                  {wh.lastTriggerStatus === 'success' ? '✓ Dispatched' : '✗ Failed'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[10px]">Never triggered</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {deleteIdConfirm === wh.id ? (
                              <div className="flex items-center justify-center gap-1.5 animate-fade-in">
                                <span className="text-[10px] text-rose-500 font-extrabold uppercase">Delete?</span>
                                <button
                                  onClick={() => {
                                    setDeleteIdConfirm(null);
                                    handleDeleteWebhook(wh.id);
                                  }}
                                  className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-extrabold rounded-md cursor-pointer border-0 transition-all shadow-xs"
                                >
                                  Yes
                                </button>
                                <button
                                  onClick={() => setDeleteIdConfirm(null)}
                                  className="px-2 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-extrabold rounded-md cursor-pointer border-0 transition-all"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleEditWebhook(wh)}
                                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer border-0 bg-transparent transition-all"
                                  title="Edit Webhook settings"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => testWebhookDeliveryById(wh.id)}
                                  disabled={testing === wh.id}
                                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-indigo-500 hover:text-indigo-650 cursor-pointer border-0 bg-transparent transition-all disabled:opacity-40"
                                  title="Run manual test dispatch"
                                >
                                  {testing === wh.id ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Play className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => setDeleteIdConfirm(wh.id)}
                                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-rose-500 hover:text-rose-700 cursor-pointer border-0 bg-transparent transition-all"
                                  title="Revoke & Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Test result console view */}
            {testResult && (
              <div className="bg-slate-55 dark:bg-slate-950 p-5 rounded-2xl border border-slate-150 dark:border-slate-850 animate-fade-in relative">
                <button 
                  onClick={() => setTestResult(null)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer border-0 bg-transparent"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl mt-0.5 ${testResult.success ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                    <Activity className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider leading-none mb-1">Sandbox delivery handshake response</span>
                    <strong className="text-sm font-bold text-slate-900 dark:text-white block">
                      {testResult.success ? '✓ Outbound Handshake Successful' : '✗ Target handshake rejected'}
                    </strong>
                    <p className="text-xs text-slate-500 font-semibold mt-1 leading-relaxed">{testResult.message}</p>
                    
                    {testResult.sentPayload && (
                      <div className="mt-4">
                        <span className="text-[10px] font-black uppercase text-slate-450 block tracking-wider mb-1">Customized JSON Dispatched</span>
                        <pre className="text-[10px] font-mono leading-relaxed font-semibold bg-white dark:bg-slate-900 p-3 rounded-xl overflow-x-auto text-slate-700 dark:text-slate-300 border border-slate-150 dark:border-slate-850 max-h-[140px] select-all">
                          {JSON.stringify(testResult.sentPayload, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          
          /* 2B. COMPREHENSIVE WEBHOOK CONFIGURATION / CREATOR FORM VIEW */
          <motion.div
            key="edit-panel"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="space-y-8 py-4"
          >
            
            {/* Template Selector Carousel */}
            <div className="bg-slate-55 dark:bg-slate-955 p-5 rounded-3xl border border-slate-150 dark:border-slate-850/65 animate-fade-in">
              <span className="text-[9px] font-black uppercase text-indigo-500 block mb-2 tracking-widest font-mono">Quick Prebuilt Templates Library</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {templates.map(tpl => (
                  <div 
                    key={tpl.id}
                    onClick={() => handleApplyTemplate(tpl)}
                    className="p-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-2xl cursor-pointer transition-all flex flex-col justify-between group shadow-sm"
                  >
                    <div>
                      <strong className="text-xs font-black text-slate-800 dark:text-white group-hover:text-[#6366f1] transition-colors block">{tpl.name}</strong>
                      <span className="text-[11px] text-slate-500 leading-relaxed font-semibold block mt-1">{tpl.desc}</span>
                    </div>
                    <span className="text-[9px] font-bold text-[#6366f1] uppercase tracking-wider block mt-3">Apply Template →</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Basic setup info fields */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
              
              {/* Left Column: Basic Parameters */}
              <div className="space-y-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Connection Identifier Name</label>
                  <input 
                    type="text"
                    value={webhookName}
                    onChange={(e) => setWebhookName(e.target.value)}
                    placeholder="e.g. Production Alerts Endpoints"
                    className="bg-slate-55 dark:bg-slate-950 border border-slate-200 dark:border-slate-801 px-4 py-2.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-400 font-semibold text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Brief Description</label>
                  <input 
                    type="text"
                    value={webhookDesc}
                    onChange={(e) => setWebhookDesc(e.target.value)}
                    placeholder="Provides compliance alerts..."
                    className="bg-slate-55 dark:bg-slate-950 border border-slate-200 dark:border-slate-801 px-4 py-2.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-400 font-semibold text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Outbound Handshake URL</label>
                  <input 
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://yourserver.com/alerts-post"
                    className="bg-slate-55 dark:bg-slate-950 border border-slate-202 dark:border-slate-801 px-4 py-2.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-400 font-semibold text-slate-800 dark:text-slate-200 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-505 tracking-wider">Signing Token/Secret</label>
                    <input 
                      type="password"
                      value={webhookSecret}
                      onChange={(e) => setWebhookSecret(e.target.value)}
                      placeholder="X-Signing-Secret"
                      className="bg-slate-55 dark:bg-slate-950 border border-slate-202 dark:border-slate-801 px-4 py-2.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-400 font-semibold text-slate-805 dark:text-slate-200"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Channel Status</label>
                    <select
                      value={webhookStatus}
                      onChange={(e) => setWebhookStatus(e.target.value as any)}
                      className="bg-slate-55 dark:bg-slate-950 border border-slate-202 dark:border-slate-801 px-4 py-2.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-400 font-semibold text-slate-800 dark:text-slate-200 h-10"
                    >
                      <option value="enabled">Active / Enabled</option>
                      <option value="disabled">Paused / Disabled</option>
                    </select>
                  </div>
                </div>

                {/* Custom HTTP Headers Builder */}
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Custom Header Variables</span>
                    <button 
                      onClick={() => setCustomHeaders([...customHeaders, { key: '', value: '' }])}
                      className="text-[9px] font-bold text-indigo-500 hover:text-indigo-650 flex items-center gap-1 border-0 bg-transparent cursor-pointer font-sans"
                    >
                      + Add Header
                    </button>
                  </div>
                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {customHeaders.length === 0 ? (
                      <span className="text-[10px] text-slate-400 font-semibold italic block">No custom headers defined.</span>
                    ) : (
                      customHeaders.map((header, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input 
                            type="text"
                            value={header.key}
                            onChange={(e) => {
                              const list = [...customHeaders];
                              list[index].key = e.target.value;
                              setCustomHeaders(list);
                            }}
                            placeholder="Header-Key"
                            className="w-1/3 bg-slate-55 dark:bg-slate-950 border border-slate-202 dark:border-slate-840 px-2 py-1.5 rounded-lg text-[10px] outline-none font-mono text-slate-700 dark:text-slate-300"
                          />
                          <input 
                            type="text"
                            value={header.value}
                            onChange={(e) => {
                              const list = [...customHeaders];
                              list[index].value = e.target.value;
                              setCustomHeaders(list);
                            }}
                            placeholder="Value"
                            className="flex-1 bg-slate-55 dark:bg-slate-950 border border-slate-202 dark:border-slate-840 px-2 py-1.5 rounded-lg text-[10px] outline-none font-mono text-slate-700 dark:text-slate-300"
                          />
                          <button 
                            onClick={() => setCustomHeaders(customHeaders.filter((_, idx) => idx !== index))}
                            className="text-rose-500 hover:text-rose-700 border-0 bg-transparent text-xs cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Right Columns: Triggers, Conditions & Custom Mappings */}
              <div className="lg:col-span-2 space-y-6 lg:border-l border-slate-100 dark:border-slate-800 lg:pl-8">
                
                {/* Event triggers list checkboxes */}
                <div>
                  <h4 className="text-xs font-black uppercase text-indigo-500 tracking-wider mb-2">Configure Outbound Triggers</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {['hiring', 'dataset', 'decision'].map(t => (
                      <div 
                        key={t}
                        onClick={() => {
                          if (triggers.includes(t)) {
                            setTriggers(triggers.filter(x => x !== t));
                          } else {
                            setTriggers([...triggers, t]);
                          }
                        }}
                        className={`p-3 border rounded-2xl cursor-pointer transition-all text-center ${triggers.includes(t) ? 'bg-[#5046e5]/5 dark:bg-[#5046e5]/10 border-[#5046e5]/30' : 'border-slate-150 dark:border-slate-800'}`}
                      >
                        <span className="text-[10px] font-black uppercase block text-slate-500 tracking-wider dark:text-slate-300">{t} SCAN</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Slider bias threshold */}
                  <div className="mt-4 bg-slate-55 dark:bg-slate-950 p-4 rounded-2xl border border-slate-150 dark:border-slate-840">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Minimum Bias score to Dispatch: <strong>{minBiasScore}</strong></span>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      value={minBiasScore}
                      onChange={(e) => setMinBiasScore(Number(e.target.value))}
                      className="w-full accent-indigo-555 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* 2D. CONDITIONAL IF/THEN HOOK LOGIC BUILDER */}
                <div>
                  <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                    <div>
                      <h4 className="text-xs font-black uppercase text-indigo-500 tracking-wider">Conditional Dispatch Logic (If/Then)</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">The webhook only triggers when all specified conditional rules evaluate to true.</p>
                    </div>
                    <button 
                      onClick={handleAddCondition}
                      className="text-[9px] font-bold text-[#5046e5] hover:text-indigo-650 flex items-center gap-1 border-0 bg-transparent cursor-pointer font-sans"
                    >
                      + Add Condition
                    </button>
                  </div>

                  <div className="space-y-2">
                    {conditions.length === 0 ? (
                      <span className="text-[10px] text-slate-400 font-semibold italic block">No constraints set. Handshake triggers for all evaluations.</span>
                    ) : (
                      conditions.map((cond, index) => (
                        <div key={index} className="flex items-center gap-2 animate-fade-in">
                          <span className="text-[10px] text-slate-400 font-mono tracking-widest font-black">IF</span>
                          <select
                            value={cond.field}
                            onChange={(e) => handleEditCondition(index, 'field', e.target.value)}
                            className="bg-slate-55 dark:bg-slate-950 border border-slate-202 dark:border-slate-801 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 outline-none"
                          >
                            <option value="bias_score">bias_score</option>
                            <option value="module">module</option>
                            <option value="verdict">verdict</option>
                            <option value="compliance.eeoc">compliance.eeoc</option>
                            <option value="compliance.eu_ai_act">compliance.eu_ai_act</option>
                          </select>

                          <select
                            value={cond.operator}
                            onChange={(e) => handleEditCondition(index, 'operator', e.target.value)}
                            className="bg-slate-55 dark:bg-slate-950 border border-slate-202 dark:border-slate-801 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 outline-none"
                          >
                            <option value=">">&gt;</option>
                            <option value="<">&lt;</option>
                            <option value="=">equals</option>
                            <option value="includes">includes</option>
                          </select>

                          <input 
                            type="text"
                            value={cond.value}
                            onChange={(e) => handleEditCondition(index, 'value', e.target.value)}
                            placeholder="Value"
                            className="flex-1 bg-slate-55 dark:bg-slate-955 border border-slate-202 dark:border-slate-801 px-3 py-1.5 rounded-lg text-[10px] font-semibold text-slate-800 dark:text-slate-200 outline-none"
                          />

                          <button 
                            onClick={() => handleRemoveCondition(index)}
                            className="text-rose-500 hover:text-rose-700 border-0 bg-transparent text-xs cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 2C. PAYLOAD CUSTOMIZATION SHIELD OPTIONS (Selecting fields & custom mapping renaming) */}
                <div>
                  <h4 className="text-xs font-black uppercase text-indigo-555 tracking-wider mb-2">Outbound custom Payload variables Checklist</h4>
                  <div className="bg-slate-55 dark:bg-slate-955 p-4 rounded-2xl border border-slate-150 dark:border-slate-840">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      {[
                        'event', 'timestamp', 'audit_id', 'module', 'bias_score', 'verdict', 'flagged', 'compliance', 'report_url', 'recommendations', 'raw_input_data', 'full_audit_json'
                      ].map(f => (
                        <label key={f} className="flex items-center gap-1.5 cursor-pointer leading-none">
                          <input 
                            type="checkbox"
                            checked={payloadFields.includes(f)}
                            onChange={() => handleTogglePayloadField(f)}
                            className="accent-indigo-500 rounded"
                          />
                          <span>{f}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Field-remapping / Renaming keys row */}
                <div>
                  <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                    <div>
                      <h4 className="text-xs font-black uppercase text-[#5046e5] tracking-wider">Dynamic Fields Renaming (Mapping)</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Translate default outbound output JSON field properties to conform with your existing backend parser structure.</p>
                    </div>
                    <button 
                      onClick={handleAddMapping}
                      className="text-[9px] font-bold text-indigo-500 hover:text-indigo-650 flex items-center gap-1 border-0 bg-transparent cursor-pointer font-sans"
                    >
                      + Add Mapping
                    </button>
                  </div>

                  <div className="space-y-2">
                    {fieldMappings.length === 0 ? (
                      <span className="text-[10px] text-slate-400 font-semibold italic block">No renaming applied. Outputs default property objects.</span>
                    ) : (
                      fieldMappings.map((map, index) => (
                        <div key={index} className="flex items-center gap-3 animate-fade-in">
                          <select
                            value={map.original}
                            onChange={(e) => handleEditMapping(index, e.target.value, map.custom)}
                            className="bg-slate-55 dark:bg-slate-955 border border-slate-202 dark:border-slate-800 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 outline-none"
                          >
                            <option value="event">event</option>
                            <option value="timestamp">timestamp</option>
                            <option value="audit_id">audit_id</option>
                            <option value="module">module</option>
                            <option value="bias_score">bias_score</option>
                            <option value="verdict">verdict</option>
                            <option value="compliance">compliance</option>
                            <option value="report_url">report_url</option>
                            <option value="recommendations">recommendations</option>
                            <option value="raw_input_data">raw_input_data</option>
                          </select>
                          <span className="text-[10px] text-slate-400 font-bold font-mono">→ Rename To:</span>
                          <input 
                            type="text"
                            value={map.custom}
                            onChange={(e) => handleEditMapping(index, map.original, e.target.value)}
                            placeholder="e.g. risk_assessment_rating"
                            className="flex-1 bg-slate-55 dark:bg-slate-955 border border-[#6366f1]/20 px-3 py-1.5 rounded-lg text-[10px] font-semibold text-slate-800 dark:text-slate-200 focus:border-[#6366f1] outline-none"
                          />
                          <button 
                            onClick={() => handleRemoveMapping(index)}
                            className="text-rose-500 hover:text-rose-705 border-0 bg-transparent text-xs cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Back action forms triggers */}
            <div className="flex gap-3 justify-end pt-5 border-t border-slate-100 dark:border-slate-800">
              <button 
                type="button"
                onClick={() => setIsEditing(false)}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/60 text-slate-700 dark:text-white py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Back To Multi-Console
              </button>
              
              <button 
                type="button"
                onClick={saveWebhook}
                disabled={saving}
                className="bg-[#6366f1] hover:bg-[#4f46e5] text-white py-2.5 px-5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" /> 
                {saving ? 'Saving...' : 'Save & Activate Webhook'}
              </button>
            </div>

            {/* Trace diagnostic log for specific editing webhook */}
            {editingId && (
              <div className="bg-slate-55 dark:bg-slate-955 p-5 rounded-3xl border border-slate-150 dark:border-slate-850 mt-8">
                <span className="text-[9px] font-black tracking-widest text-[#6366f1] uppercase block mb-1">trace activity logs</span>
                <strong className="text-sm font-bold text-slate-900 dark:text-white block mb-3">Delivery historical logs (selected hook)</strong>
                {(() => {
                  const activeWhObj = webhooks.find(w => w.id === editingId);
                  const logs = activeWhObj?.logs || [];
                  if (logs.length === 0) {
                    return (
                      <span className="text-[11px] text-slate-400 italic block py-4 text-center">No successful dispatch attempts recorded yet. Run a sandbox manual trial above!</span>
                    );
                  }
                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[9px] font-black uppercase">
                            <th className="pb-2">Time</th>
                            <th className="pb-2">Event</th>
                            <th className="pb-2">Response Status</th>
                            <th className="pb-2">Attempt</th>
                            <th className="pb-2">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-900 font-semibold text-slate-600 dark:text-slate-400 font-mono text-[10px]">
                          {logs.map((lg: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-100/50 dark:hover:bg-slate-900/10">
                              <td className="py-2.5">{new Date(lg.timestamp).toLocaleString()}</td>
                              <td className="py-2.5 font-bold">{lg.event || 'audit_complete'}</td>
                              <td className="py-2.5">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${lg.success ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                                  Code {lg.status}
                                </span>
                              </td>
                              <td className="py-2.5">{lg.attempt || 1}/5</td>
                              <td className="py-2.5 truncate max-w-[200px]" title={lg.message}>{lg.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

        {/* INTEGRATIONS DIRECTORY */}
        <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-black tracking-widest text-[#6366f1] uppercase block mb-1">Optional SaaS Pipelines</span>
          <h4 className="text-xl font-extrabold text-slate-900 dark:text-white mb-1.5 font-display">Enterprise Application Connections</h4>
          <p className="text-xs text-slate-500 font-semibold mb-6">
            Configure automated integrations to propagate audit checklists into Slack channels, Google spreadsheets, Notion databases, or custom mailing lists automatically.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {integrationCards.map((card) => (
              <div 
                key={card.id}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900 p-6 rounded-3xl flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden group border-b-2 hover:-translate-y-0.5"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-white dark:bg-slate-900 w-12 h-12 rounded-2xl flex items-center justify-center border border-slate-100 dark:border-slate-850 shadow-sm text-slate-900 dark:text-white">
                      {card.icon}
                    </div>
                    {card.connected ? (
                      <span className="bg-emerald-55 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-450 px-2 py-0.5 rounded-full text-[9px] font-black uppercase border border-emerald-100/30">
                        ● Connected
                      </span>
                    ) : (
                      <span className="bg-slate-100 dark:bg-slate-855 text-slate-400 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">
                        Offline
                      </span>
                    )}
                  </div>
                  <strong className="text-base font-bold text-slate-800 dark:text-white block mb-1">{card.name}</strong>
                  <p className="text-xs text-slate-500 leading-relaxed font-semibold mb-4 min-h-[50px]">{card.description}</p>
                  
                  {card.connected && (
                    <div className="bg-white dark:bg-slate-900/50 p-2 rounded-xl mb-4 border border-dashed border-slate-150 dark:border-slate-800 font-mono text-[9px] font-bold text-[#6366f1] truncate">
                      {card.detailsText}
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => setActiveConnector(card.id)}
                  className={`w-full py-2.5 rounded-xl text-xs font-black border-0 cursor-pointer transition-all ${
                    card.connected 
                      ? 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-205 dark:hover:bg-slate-750' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:scale-[1.02]'
                  }`}
                >
                  {card.connected ? 'Configure Connector' : 'Connect Channel'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CONNECTOR EDIT DIALOG MODULE */}
      <AnimatePresence>
        {activeConnector && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              transition={{ type: "spring", duration: 0.3 }}
              className={`bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl w-full ${activeConnector === 'firewall' ? 'max-w-4xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative`}
            >
            <button 
              onClick={() => setActiveConnector(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer border-0 bg-transparent"
            >
              <X className="w-5 h-5" />
            </button>

            {activeConnector === 'slack' && (
              <div>
                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                  <div className="bg-pink-50 p-2.5 rounded-xl"><Slack className="w-6 h-6 text-pink-500" /></div>
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Slack Notifications Config</h3>
                    <span className="text-[10px] text-slate-400 font-black uppercase">Automated Channel Alerts</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Setup Instructions Card */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs">
                    <div className="font-extrabold text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-1.5 uppercase tracking-wider text-[9px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                      How to get your Slack Webhook URL?
                    </div>
                    <ol className="list-decimal pl-4.5 space-y-1.5 text-[11px] text-slate-605 dark:text-slate-350 leading-relaxed font-semibold">
                      <li>Log in to <a href="https://api.slack.com/apps" target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Slack App Directory</a> and select/create a Slack Custom App.</li>
                      <li>Navigate to <strong>Incoming Webhooks</strong> in your Slack Admin dashboard.</li>
                      <li>Toggle <strong>Activate Incoming Webhooks</strong> to <span className="text-emerald-600 dark:text-emerald-450 font-bold">On</span>.</li>
                      <li>Click the <strong>Add New Webhook to Workspace</strong> action button.</li>
                      <li>Select your channel (e.g. <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono font-bold text-[10px] text-slate-800 dark:text-slate-200">#compliance-alerts</code>).</li>
                      <li>Copy the generated Webhook URL and paste it into the field below.</li>
                    </ol>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-450">Incoming Webhook URL</label>
                    <input 
                      type="url"
                      value={slackConfig.webhookUrl}
                      onChange={(e) => setSlackConfig({ ...slackConfig, webhookUrl: e.target.value })}
                      placeholder="https://hooks.slack.com/services/XXXXXX"
                      className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-801 px-3.5 py-2 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-400 font-semibold"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-450">Target Channel Name</label>
                    <input 
                      type="text"
                      value={slackConfig.channel}
                      onChange={(e) => setSlackConfig({ ...slackConfig, channel: e.target.value })}
                      placeholder="#compliance-alerts"
                      className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-801 px-3.5 py-2 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-400 font-semibold h-10"
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button 
                      onClick={() => testEnterpriseConnector('slack')}
                      disabled={connectorTestStatus === 'executing'}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-202 py-2.5 rounded-xl text-xs font-bold cursor-pointer border-0"
                    >
                      {connectorTestStatus === 'executing' ? 'Testing...' : 'Test Connection'}
                    </button>
                    <button 
                      onClick={() => saveConnectorForm('slack')}
                      className="flex-1 bg-[#6366f1] text-white hover:bg-indigo-700 py-2.5 rounded-xl text-xs font-bold cursor-pointer border-0"
                    >
                      Save & Activate
                    </button>
                  </div>

                  {slackConfig.enabled && (
                    <button 
                      onClick={() => disconnectConnectorAndClear('slack')}
                      className="w-full bg-rose-50 hover:bg-rose-100/80 text-rose-500 dark:bg-rose-955/20 dark:text-rose-400 font-bold py-2 rounded-xl text-xs cursor-pointer border-0 mt-2"
                    >
                      Disconnect Connector
                    </button>
                  )}

                  {connectorTestStatus === 'success' && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/30 rounded-xl text-emerald-600 dark:text-emerald-450 text-[11px] font-semibold mt-2">
                      ✓ Slack handshake parsed successfully! Broadcast target is active.
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeConnector === 'sheets' && (
              <div>
                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                  <div className="bg-emerald-50 p-2.5 rounded-xl"><Database className="w-6 h-6 text-emerald-505" /></div>
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Google Sheets Sync Config</h3>
                    <span className="text-[10px] text-slate-400 font-black uppercase">Live Spreadsheet Appender</span>
                  </div>
                </div>

                {activeDirectAuth === 'google' ? (
                  <div className="text-center p-2">
                    <div className="flex justify-center mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-55 border border-emerald-100 flex items-center justify-center text-3xl shadow-sm">
                        🌿
                      </div>
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-800 dark:text-white mb-1">Grant FairAudit Spreadsheet Scopes</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold max-w-xs mx-auto mb-4 leading-relaxed">
                      Connect via secure direct handoff on your current login session profile.
                    </p>
                    
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-150 dark:border-slate-850 text-left mb-4 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-[#10b981] text-white flex items-center justify-center text-[10px] font-bold">✓</div>
                        <div>
                          <strong className="text-xs text-slate-800 dark:text-slate-200 block leading-none">{emailToUse}</strong>
                          <span className="text-[9px] text-slate-400 uppercase font-black font-mono">Authorized Profile</span>
                        </div>
                      </div>
                      <div className="h-px bg-slate-200 dark:bg-slate-800 my-2"></div>
                      <div className="text-[10px] text-slate-600 dark:text-slate-450 leading-relaxed font-semibold">
                        <strong>Consent Level: Shared Workspace Appender</strong>
                        <ul className="list-disc leading-tight pl-4 space-y-1 mt-1 text-[9px] text-slate-500">
                          <li>Write and sync dynamic scan reports</li>
                          <li>Establish default spreadsheet "FairAudit_Realtime_Insights"</li>
                        </ul>
                      </div>
                    </div>

                    {authStage === 'consent' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setActiveDirectAuth(null)}
                          className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 rounded-xl text-xs font-bold border-0 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleConfirmDirectConnect('google')}
                          className="flex-1 bg-[#10b981] hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-bold border-0 cursor-pointer shadow-sm"
                        >
                          Allow & Authorize
                        </button>
                      </div>
                    )}

                    {authStage === 'authorizing' && (
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase text-[#10b981] font-sans font-black">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Handshaking Google OAuth...
                        </div>
                        <p className="text-[9px] text-slate-400 font-mono italic">{authStepText}</p>
                      </div>
                    )}

                    {authStage === 'success' && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-955/20 border border-emerald-100/30 rounded-xl text-emerald-600 dark:text-emerald-450 text-[10px] font-bold">
                        ✓ Connection active! Syncing database templates...
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Google Direct Handoff Option */}
                    <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-505/20 p-4 rounded-2xl text-left">
                      <div className="flex items-start gap-3">
                        <div className="bg-emerald-500 p-2 rounded-xl text-white">
                          <Database className="w-5 h-5 animate-pulse" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-450 tracking-wider font-mono">Fast Direct Account Login</h4>
                          <strong className="text-sm font-extrabold text-slate-805 dark:text-slate-100 block">One-Click Google Handoff</strong>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed font-semibold">
                            Instantly link your current login session <strong>{emailToUse}</strong> to sync all compliance audits on your drive.
                          </p>
                          <button
                            onClick={() => handleStartDirectConnect('google')}
                            className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer border-0 w-full"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-305 animate-ping"></span>
                            Connect Workspace Direct
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 my-2">
                      <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1"></div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Or Manual Option Configuration</span>
                      <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1"></div>
                    </div>

                    {/* Setup Instructions Card */}
                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-802 text-[11px] text-left">
                      <div className="font-extrabold text-emerald-600 dark:text-emerald-450 mb-1 flex items-center gap-1 uppercase tracking-wider text-[8px]">
                        <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                        Manual Spreadsheet Setup
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                        Create a Google Sheet and copy its Spreadsheet ID from the horizontal address bar segment before the <code className="font-bold font-mono">/edit</code> section.
                      </p>
                    </div>

                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-[10px] font-black uppercase text-slate-450">Spreadsheet ID</label>
                      <input 
                        type="text"
                        value={sheetsConfig.spreadsheetId}
                        onChange={(e) => setSheetsConfig({ ...sheetsConfig, spreadsheetId: e.target.value })}
                        placeholder="1p_6k-WOfm893R3_hjsD832H9wSKS"
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-801 px-3.5 py-2 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-400 font-semibold h-10"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-[10px] font-black uppercase text-slate-455">Target Worksheet Name</label>
                      <input 
                        type="text"
                        value={sheetsConfig.sheetName}
                        onChange={(e) => setSheetsConfig({ ...sheetsConfig, sheetName: e.target.value })}
                        placeholder="Sheet1"
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-801 px-3.5 py-2 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-400 font-semibold h-10"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => testEnterpriseConnector('sheets')}
                        disabled={connectorTestStatus === 'executing'}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-202 py-2.5 rounded-xl text-xs font-bold cursor-pointer border-0"
                      >
                        {connectorTestStatus === 'executing' ? 'Testing...' : 'Test Connection'}
                      </button>
                      <button 
                        onClick={() => saveConnectorForm('sheets')}
                        className="flex-1 bg-[#6366f1] text-white hover:bg-indigo-700 py-2.5 rounded-xl text-xs font-bold cursor-pointer border-0"
                      >
                        Save & Activate
                      </button>
                    </div>

                    {sheetsConfig.enabled && (
                      <button 
                        onClick={() => disconnectConnectorAndClear('sheets')}
                        className="w-full bg-rose-50 hover:bg-rose-100/80 text-rose-500 dark:bg-rose-955/20 dark:text-rose-450 font-bold py-2 rounded-xl text-xs cursor-pointer border-0 mt-1"
                      >
                        Disconnect Connector
                      </button>
                    )}

                    {sheetsConfig.enabled && sheetsLogs.length > 0 && (
                      <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4 text-left">
                        <span className="text-[9px] font-black tracking-widest text-[#10b981] uppercase block mb-1">Live Synced Spreadsheet Preview</span>
                        <strong className="text-[11px] font-extrabold text-slate-800 dark:text-white block mb-2">Worksheet: {sheetsConfig.sheetName}</strong>
                        <div className="overflow-x-auto rounded-xl border border-slate-150 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 font-mono text-[9px] max-h-36">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-150 dark:border-slate-800 font-bold text-slate-455 text-[8px]">
                                <th className="p-2">Timestamp</th>
                                <th className="p-2">Audit ID</th>
                                <th className="p-2">Score</th>
                                <th className="p-2">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-155 dark:divide-slate-850">
                              {sheetsLogs.slice(0, 4).map((log: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-200/40 dark:hover:bg-slate-900/50">
                                  <td className="p-2 text-slate-400 truncate max-w-[70px]">
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                  </td>
                                  <td className="p-2 font-bold text-slate-700 dark:text-slate-300">
                                    {log.auditId}
                                  </td>
                                  <td className="p-2 text-[#6366f1] font-extrabold">{log.score}%</td>
                                  <td className="p-2">
                                    <span className={`px-1.5 py-0.5 rounded-full text-[7.5px] font-black uppercase ${
                                      log.status === 'COMPLIANT' || log.status === 'CLEAN'
                                        ? 'bg-emerald-50 text-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400'
                                        : 'bg-rose-50 text-rose-500 dark:bg-rose-955/20 dark:text-rose-450 font-bold'
                                    }`}>
                                      {log.status === 'COMPLIANT' ? 'COMPLIANT' : 'REVIEW'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {connectorTestStatus === 'success' && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/30 rounded-xl text-emerald-600 dark:text-emerald-450 text-[11px] font-semibold mt-2">
                        ✓ Sheets row sync compiled. Cell validation ranges matched perfectly!
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeConnector === 'notion' && (
              <div>
                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                  <div className="bg-amber-50 p-2.5 rounded-xl"><FileText className="w-6 h-6 text-amber-500" /></div>
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Notion Database Config</h3>
                    <span className="text-[10px] text-slate-400 font-black uppercase font-mono">Workspace Documenter</span>
                  </div>
                </div>

                {activeDirectAuth === 'notion' ? (
                  <div className="text-center p-2">
                    <div className="flex justify-center mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-3xl shadow-sm">
                        📓
                      </div>
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-800 dark:text-white mb-1">Link Notion Workspace Board</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold max-w-xs mx-auto mb-4 leading-relaxed">
                      Sync live bias reports and checklists into your compliance team directory page.
                    </p>
                    
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-150 dark:border-slate-850 text-left mb-4 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-[#f59e0b] text-white flex items-center justify-center text-[10px] font-bold font-sans">✓</div>
                        <div>
                          <strong className="text-xs text-slate-800 dark:text-slate-200 block leading-none">{emailToUse}</strong>
                          <span className="text-[9px] text-slate-400 uppercase font-black font-mono">Notion Connection Session</span>
                        </div>
                      </div>
                      <div className="h-px bg-slate-200 dark:bg-slate-800 my-2"></div>
                      <div className="text-[10px] text-slate-600 dark:text-slate-450 leading-relaxed font-semibold">
                        <strong>Requested Scopes:</strong>
                        <ul className="list-disc leading-tight pl-4 space-y-1 mt-1 text-[9px] text-slate-500">
                          <li>Create new sub-pages with detailed audit logs</li>
                          <li>Append compliance action checklists to shared workspace folders</li>
                        </ul>
                      </div>
                    </div>

                    {authStage === 'consent' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setActiveDirectAuth(null)}
                          className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 rounded-xl text-xs font-bold border-0 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleConfirmDirectConnect('notion')}
                          className="flex-1 bg-amber-550 hover:bg-amber-600 bg-[#f59e0b] text-white py-2 rounded-xl text-xs font-bold border-0 cursor-pointer shadow-sm"
                        >
                          Authorize Notion
                        </button>
                      </div>
                    )}

                    {authStage === 'authorizing' && (
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase text-amber-500 font-sans">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Handshaking Notion API...
                        </div>
                        <p className="text-[9px] text-slate-400 font-mono italic">{authStepText}</p>
                      </div>
                    )}

                    {authStage === 'success' && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-955/20 border border-amber-100/30 rounded-xl text-amber-650 dark:text-amber-450 text-[10px] font-bold">
                        ✓ Notion database linked! Mapping workspace directories...
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Notion Direct Connect layout */}
                    <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-4 rounded-2xl text-left">
                      <div className="flex items-start gap-3">
                        <div className="bg-amber-500 p-2 rounded-xl text-white">
                          <FileText className="w-5 h-5 animate-pulse" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-450 tracking-wider font-mono">Direct Workspace Connect</h4>
                          <strong className="text-sm font-extrabold text-slate-800 dark:text-slate-100 block">Link Notion Account Direct</strong>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed font-semibold">
                            Authorize Notion directly to sync regulatory checkers into compliance folders on your active dashboard.
                          </p>
                          <button
                            onClick={() => handleStartDirectConnect('notion')}
                            className="mt-3 bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer border-0 w-full"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-305 animate-ping"></span>
                            Connect Notion Workspace
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 my-2">
                      <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1"></div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Or Manual Setup parameters</span>
                      <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1"></div>
                    </div>

                    {/* Setup Instructions Card */}
                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-802 text-[11px] text-left">
                      <div className="font-extrabold text-amber-600 dark:text-amber-500 mb-1 flex items-center gap-1 uppercase tracking-wider text-[8px]">
                        <span className="w-1 h-1 rounded-full bg-amber-500"></span>
                        Manual Database integration
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                        Specify details to establish custom workspaces: map database structures and checklist variables manually.
                      </p>
                    </div>

                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-[10px] font-black uppercase text-slate-455">Parent Page/Database ID</label>
                      <input 
                        type="text"
                        value={notionConfig.parentPageId}
                        onChange={(e) => setNotionConfig({ ...notionConfig, parentPageId: e.target.value })}
                        placeholder="f81d4fae-7dec-11d0-a765-00a0c91e6bf6"
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-205 px-3.5 py-2 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-400 font-semibold h-10"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-[10px] font-black uppercase text-slate-455">Database Name</label>
                      <input 
                        type="text"
                        value={notionConfig.databaseName}
                        onChange={(e) => setNotionConfig({ ...notionConfig, databaseName: e.target.value })}
                        placeholder="FairAudit Log Folder"
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-205 px-3.5 py-2 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-400 font-semibold h-10"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => testEnterpriseConnector('notion')}
                        disabled={connectorTestStatus === 'executing'}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-2.5 rounded-xl text-xs font-bold cursor-pointer border-0"
                      >
                        {connectorTestStatus === 'executing' ? 'Testing...' : 'Test Connection'}
                      </button>
                      <button 
                        onClick={() => saveConnectorForm('notion')}
                        className="flex-1 bg-[#6366f1] text-white hover:bg-indigo-700 py-2.5 rounded-xl text-xs font-bold cursor-pointer border-0"
                      >
                        Save & Activate
                      </button>
                    </div>

                    {notionConfig.enabled && (
                      <button 
                        onClick={() => disconnectConnectorAndClear('notion')}
                        className="w-full bg-rose-50 hover:bg-rose-100/80 text-rose-500 dark:bg-rose-955/20 dark:text-rose-450 font-bold py-2 rounded-xl text-xs cursor-pointer border-0 mt-1"
                      >
                        Disconnect Connector
                      </button>
                    )}

                    {notionConfig.enabled && notionLogs.length > 0 && (
                      <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4 text-left">
                        <span className="text-[9px] font-black tracking-widest text-[#f59e0b] uppercase block mb-1 font-mono">Notion Compliance Board Overview</span>
                        <strong className="text-[11px] font-extrabold text-slate-800 dark:text-white block mb-2">DB: {notionConfig.databaseName}</strong>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto">
                          {notionLogs.slice(0, 3).map((page: any, i: number) => (
                            <div key={i} className="p-2 border border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 rounded-xl text-[10px] flex items-center justify-between hover:border-amber-200 transition-all font-sans">
                              <div className="truncate max-w-[180px]">
                                <strong className="text-slate-800 dark:text-slate-200 block truncate leading-tight font-extrabold">{page.title}</strong>
                                <span className="text-[8px] text-slate-400 font-bold uppercase font-mono">{page.module} evaluation • {page.checklistCount} rules exported</span>
                              </div>
                              <span className={`px-1.5 py-0.5 rounded-full text-[8.5px] font-black font-mono uppercase ${
                                page.status === 'Approved' 
                                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/10 dark:text-emerald-400'
                                  : 'bg-amber-50 text-amber-600 dark:bg-amber-900/10 dark:text-amber-400'
                              }`}>
                                {page.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {connectorTestStatus === 'success' && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/30 rounded-xl text-emerald-600 dark:text-emerald-450 text-[11px] font-semibold mt-2">
                        ✓ Notion integration handshake completed. Database properties mapped!
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeConnector === 'email' && (
              <div>
                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                  <div className="bg-blue-50 p-2.5 rounded-xl"><Mail className="w-6 h-6 text-blue-500" /></div>
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Email Alert Digest Config</h3>
                    <span className="text-[10px] text-slate-400 font-black uppercase">Recipient Subscriptions</span>
                  </div>
                </div>

                {activeDirectAuth === 'email' ? (
                  <div className="text-center p-2">
                    <div className="flex justify-center mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-3xl shadow-sm">
                        📬
                      </div>
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-800 dark:text-white mb-1">Authorizing Direct Email Sender</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold max-w-xs mx-auto mb-4 leading-relaxed">
                      Connect your active workspace account <strong>{emailToUse}</strong> as the secure dispatcher.
                    </p>
                    
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-150 dark:border-slate-850 text-left mb-4 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold">✓</div>
                        <div>
                          <strong className="text-xs text-slate-800 dark:text-slate-200 block leading-none">{emailToUse}</strong>
                          <span className="text-[9px] text-slate-400 uppercase font-black font-mono">Sign-In Sender Session</span>
                        </div>
                      </div>
                      <div className="h-px bg-slate-200 dark:bg-slate-800 my-2"></div>
                      <div className="text-[10px] text-slate-600 dark:text-slate-450 leading-relaxed font-semibold">
                        <strong>Requested Delegation:</strong>
                        <ul className="list-disc leading-tight pl-4 space-y-1 mt-1 text-[9px] text-slate-500">
                          <li>Send scheduled HTML digest summaries to subscribers</li>
                          <li>Dispatch urgent EU AI Act non-compliance notifications</li>
                        </ul>
                      </div>
                    </div>

                    {authStage === 'consent' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setActiveDirectAuth(null)}
                          className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 rounded-xl text-xs font-bold border-0 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleConfirmDirectConnect('email')}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-xs font-bold border-0 cursor-pointer shadow-sm"
                        >
                          Allow & Bind
                        </button>
                      </div>
                    )}

                    {authStage === 'authorizing' && (
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase text-blue-500 font-sans font-black">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Handshaking Direct Mail OAuth...
                        </div>
                        <p className="text-[9px] text-slate-400 font-mono italic">{authStepText}</p>
                      </div>
                    )}

                    {authStage === 'success' && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-100/30 rounded-xl text-blue-600 dark:text-blue-450 text-[10px] font-bold">
                        ✓ Direct SMTP/OAuth binding successfully active!
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Direct Account Sync Handoff Option */}
                    <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 p-4 rounded-2xl text-left">
                      <div className="flex items-start gap-3">
                        <div className="bg-blue-500 p-2 rounded-xl text-white">
                          <Mail className="w-5 h-5 animate-pulse" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-450 tracking-wider font-mono">Fast Direct Account Login</h4>
                          <strong className="text-sm font-extrabold text-slate-808 dark:text-slate-100 block">One-Click Google Handoff</strong>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed font-semibold">
                            Instantly link your current login session <strong>{emailToUse}</strong> to distribute compliance digests.
                          </p>
                          <button
                            onClick={() => handleStartDirectConnect('email')}
                            className="mt-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer border-0 w-full"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-ping"></span>
                            Connect Workspace Direct
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 my-2">
                      <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1"></div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Or Manual Option Configuration</span>
                      <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1"></div>
                    </div>

                    {/* Setup Instructions Card */}
                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-802 text-[11px] text-left">
                      <div className="font-extrabold text-blue-600 dark:text-blue-450 mb-1 flex items-center gap-1 uppercase tracking-wider text-[8px]">
                        <span className="w-1 h-1 rounded-full bg-blue-500"></span>
                        Manual Recipient Configuration
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                        Manually key in compliance stakeholder emails below, separated by commas or semicolons.
                      </p>
                    </div>

                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-[10px] font-black uppercase text-slate-455">Recipient Email List (Comma separated)</label>
                      <input 
                        type="text"
                        value={emailConfig.recipientEmails}
                        onChange={(e) => setEmailConfig({ ...emailConfig, recipientEmails: e.target.value })}
                        placeholder="compliance_alert@firm.com, manager@firm.com"
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 px-3.5 py-2 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-400 font-semibold h-10"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => testEnterpriseConnector('email')}
                        disabled={connectorTestStatus === 'executing'}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-2.5 rounded-xl text-xs font-bold cursor-pointer border-0"
                      >
                        {connectorTestStatus === 'executing' ? 'Testing...' : 'Test Connection'}
                      </button>
                      <button 
                        onClick={() => saveConnectorForm('email')}
                        className="flex-1 bg-[#6366f1] text-white hover:bg-indigo-700 py-2.5 rounded-xl text-xs font-bold cursor-pointer border-0"
                      >
                        Save & Activate
                      </button>
                    </div>

                    {emailConfig.enabled && (
                      <button 
                        onClick={() => disconnectConnectorAndClear('email')}
                        className="w-full bg-rose-50 hover:bg-rose-100/80 text-rose-500 dark:bg-rose-955/20 dark:text-rose-450 font-bold py-2 rounded-xl text-xs cursor-pointer border-0 mt-1"
                      >
                        Disconnect Connector
                      </button>
                    )}

                    {emailConfig.enabled && emailLogs.length > 0 && (
                      <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4 text-left">
                        <span className="text-[9px] font-black tracking-widest text-[#3b82f6] uppercase block mb-1 font-mono">Outbox Alert Delivery Logs</span>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto">
                          {emailLogs.slice(0, 3).map((outbox: any, i: number) => (
                            <div key={i} className="p-2 border border-slate-100 dark:border-slate-855 bg-slate-50 dark:bg-slate-950 rounded-xl text-[10px] hover:border-blue-200 transition-all font-sans">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-[8px] text-slate-400 font-bold uppercase font-mono">{outbox.type} alert</span>
                                <span className="font-mono text-[8px] text-[#3b82f6] font-bold">✓ DISPATCHED</span>
                              </div>
                              <p className="text-slate-700 dark:text-slate-300 font-semibold mb-1 truncate">{outbox.subject}</p>
                              <div className="flex justify-between text-[8px] text-slate-400 font-medium">
                                <span className="truncate">To: {outbox.recipients}</span>
                                <span className="shrink-0">{new Date(outbox.sentAt).toLocaleTimeString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {connectorTestStatus === 'success' && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/30 rounded-xl text-emerald-600 dark:text-emerald-450 text-[11px] font-semibold mt-2">
                        ✓ Digest templates loaded and alert dispatch verified.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeConnector === 'firewall' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${firewallConfig.underAttackMode ? 'bg-amber-500 animate-pulse text-white' : 'bg-indigo-50 text-indigo-500 dark:bg-indigo-950/20'}`}>
                      <Shield className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">API Firewall & DoS Shield</h3>
                      <span className="text-[10px] text-slate-400 font-black uppercase">Enterprise Threat Prevention</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${firewallConfig.enabled ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${firewallConfig.enabled ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`}></span>
                      {firewallConfig.enabled ? 'ACTIVE PROTECTION' : 'SHIELD INACTIVE'}
                    </span>
                  </div>
                </div>

                {activeDirectAuth === 'firewall' ? (
                  <div className="text-center p-2 max-w-md mx-auto">
                    <div className="flex justify-center mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-3xl shadow-sm">
                        🛡️
                      </div>
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-800 dark:text-white mb-1">Grant FairAudit Firewall Proxy Policies</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold max-w-xs mx-auto mb-4 leading-relaxed">
                      Connect via secure direct handoff on your current login session profile.
                    </p>
                    
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-150 dark:border-slate-850 text-left mb-4 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-[#6366f1] text-white flex items-center justify-center text-[10px] font-bold">✓</div>
                        <div>
                          <strong className="text-xs text-slate-800 dark:text-slate-200 block leading-none">{emailToUse}</strong>
                          <span className="text-[9px] text-slate-400 uppercase font-black font-mono">Authorized Cloud Administrator</span>
                        </div>
                      </div>
                      <div className="h-px bg-slate-200 dark:bg-slate-800 my-2"></div>
                      <div className="text-[10px] text-slate-600 dark:text-slate-455 leading-relaxed font-semibold">
                        <strong>Consent Level: Cloud Threat Evaluator & Agent IP Banning</strong>
                        <ul className="list-disc leading-tight pl-4 space-y-1 mt-1 text-[9px] text-slate-500">
                          <li>Route dynamic API request analytics</li>
                          <li>Establish default protective rate limits (60 Requests/Min/IP)</li>
                        </ul>
                      </div>
                    </div>

                    {authStage === 'consent' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setActiveDirectAuth(null)}
                          className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 rounded-xl text-xs font-bold border-0 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleConfirmDirectConnect('firewall')}
                          className="flex-1 bg-[#6366f1] hover:bg-indigo-700 text-white py-2 rounded-xl text-xs font-bold border-0 cursor-pointer shadow-sm"
                        >
                          Allow & Sync Shield
                        </button>
                      </div>
                    )}

                    {authStage === 'authorizing' && (
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase text-indigo-500 font-sans font-black">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Handshaking Cloud Shield OAuth...
                        </div>
                        <p className="text-[9px] text-slate-400 font-mono italic">{authStepText}</p>
                      </div>
                    )}

                    {authStage === 'success' && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-955/20 border border-emerald-100/30 rounded-xl text-emerald-600 dark:text-emerald-450 text-[10px] font-bold">
                        ✓ Cloud Threat intelligence profiles active!
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Google Direct Handoff Option for Firewall */}
                    <div className="bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border border-indigo-500/20 p-4 rounded-2xl text-left">
                      <div className="flex items-start gap-3">
                        <div className="bg-[#6366f1] p-2 rounded-xl text-white">
                          <Shield className="w-5 h-5 animate-pulse" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider font-mono">Instant Cloud Armor Sync</h4>
                          <strong className="text-sm font-extrabold text-slate-800 dark:text-slate-100 block">One-Click Google / Cloud Security Sync</strong>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed font-semibold">
                            Optionally bind your current SSO login <strong>{emailToUse}</strong> to inherit active corporate threat scopes, configure optimal 60 req/min limits, and import corporate blocklists instantly.
                          </p>
                          <button
                            onClick={() => handleStartDirectConnect('firewall')}
                            className="mt-3 bg-[#6366f1] hover:bg-indigo-700 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer border-0 w-full"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-ping"></span>
                            Connect Firewall Direct
                          </button>
                        </div>
                      </div>
                    </div>

                    {firewallConfig.underAttackMode && (
                      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-700 dark:text-amber-400 flex items-start gap-3 animate-pulse">
                        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                        <div className="text-xs text-left">
                          <span className="font-extrabold block uppercase tracking-wide">Under Attack Mode Engaged</span>
                          Aggressive DoS rate limits are active. All IP addresses are locked to a strict envelope of maximum 15 requests per minute. Suspicious patterns will trigger instant permanent bans.
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left Column - Configure Settings */}
                      <div className="space-y-4">
                        <div className="bg-slate-50/50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-4">
                          <h4 className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                            <Sliders className="w-3.5 h-3.5" /> Parameters Setup
                          </h4>

                          {/* Enabled Toggle */}
                          <div className="flex items-center justify-between">
                            <div>
                              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block text-left">Enable Security Shield</label>
                              <p className="text-[10px] text-slate-400 text-left">Scan incoming requests for active threats</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer select-none">
                              <input 
                                type="checkbox" 
                                checked={firewallConfig.enabled}
                                onChange={(e) => setFirewallConfig({ ...firewallConfig, enabled: e.target.checked })}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-300 dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5046e5]"></div>
                            </label>
                          </div>

                          {/* Under Attack Mode Toggle */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                            <div>
                              <label className="text-xs font-bold text-amber-500 flex items-center gap-1 text-left">
                                <AlertTriangle className="w-3 h-3" /> Under Attack Mode
                              </label>
                              <p className="text-[10px] text-slate-400 text-left">Lock endpoints to extreme rate limits</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer select-none">
                              <input 
                                type="checkbox" 
                                checked={firewallConfig.underAttackMode}
                                onChange={(e) => setFirewallConfig({ ...firewallConfig, underAttackMode: e.target.checked })}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-amber-300 dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                            </label>
                          </div>

                          {/* Rate Limiting Toggle */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                            <div>
                              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block text-left">Dynamic IP Rate Limiting</label>
                              <p className="text-[10px] text-slate-400 text-left">Prevent brute force and script flood DoS</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer select-none">
                              <input 
                                type="checkbox" 
                                checked={firewallConfig.rateLimitByIp}
                                onChange={(e) => setFirewallConfig({ ...firewallConfig, rateLimitByIp: e.target.checked })}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-300 dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5046e5]"></div>
                            </label>
                          </div>

                          {/* SQL Injection Parsing Toggle */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                            <div>
                              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 font-sans block text-left">XSS & SQL Injection Filters</label>
                              <p className="text-[10px] text-slate-400 font-sans text-left">Sanitize parameters and query payloads</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer select-none">
                              <input 
                                type="checkbox" 
                                checked={firewallConfig.detectSqlInjection}
                                onChange={(e) => setFirewallConfig({ ...firewallConfig, detectSqlInjection: e.target.checked })}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-300 dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5046e5]"></div>
                            </label>
                          </div>

                          {/* Strict API Key Toggle */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                            <div>
                              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 font-sans block text-left">Force Strict API Keys</label>
                              <p className="text-[10px] text-slate-400 font-sans text-left">Block any incoming REST hits lacking keys</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer select-none">
                              <input 
                                type="checkbox" 
                                checked={firewallConfig.forceStrictApiKey}
                                onChange={(e) => setFirewallConfig({ ...firewallConfig, forceStrictApiKey: e.target.checked })}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-300 dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5046e5]"></div>
                            </label>
                          </div>

                          {/* Max requests input */}
                          {firewallConfig.rateLimitByIp && (
                            <div className="flex flex-col gap-1 pt-2 border-t border-slate-100 dark:border-slate-800 text-left">
                              <label className="text-[10px] font-black uppercase text-slate-400 font-sans">Rate Limit Volume (Requests/Min/IP)</label>
                              <input 
                                type="number"
                                value={firewallConfig.maxRequestsPerMin}
                                onChange={(e) => setFirewallConfig({ ...firewallConfig, maxRequestsPerMin: parseInt(e.target.value) || 120 })}
                                placeholder="120"
                                className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none w-full font-mono"
                              />
                            </div>
                          )}
                        </div>

                        <div className="bg-slate-50/50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-4">
                          <h4 className="text-xs font-black uppercase tracking-wider text-rose-500 dark:text-rose-455 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5" /> Blocklist Definitions
                          </h4>

                          {/* Blacklisted IPs */}
                          <div className="flex flex-col gap-1.5 text-left">
                            <label className="text-[10px] font-black uppercase text-slate-400 font-sans">Banned IP Addresses (Comma-separated)</label>
                            <textarea 
                              value={firewallConfig.blocklistIps}
                              onChange={(e) => setFirewallConfig({ ...firewallConfig, blocklistIps: e.target.value })}
                              placeholder="e.g. 192.168.1.1, 185.10.220.4"
                              rows={2}
                              className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none resize-none font-mono"
                            />
                          </div>

                          {/* Restricted User Agents */}
                          <div className="flex flex-col gap-1.5 text-left">
                            <label className="text-[10px] font-black uppercase text-slate-400 font-sans">Restricted User-Agent Substrings</label>
                            <input 
                              type="text"
                              value={firewallConfig.blocklistUserAgents}
                              onChange={(e) => setFirewallConfig({ ...firewallConfig, blocklistUserAgents: e.target.value })}
                              placeholder="e.g. curl, python, scrapbot, headless"
                              className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none font-sans"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right Column - Live Threat Monitor & Simulator */}
                      <div className="space-y-4 font-sans">
                        <div className="bg-slate-950 text-emerald-400 p-4 rounded-xl border border-slate-900 dark:border-slate-800 font-mono text-xs flex flex-col h-[345px] text-left">
                          <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-2">
                            <div className="flex items-center gap-1.5">
                              <Terminal className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-200">Active Threat Console</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button 
                                type="button"
                                onClick={fetchFirewallLogs}
                                className="bg-slate-900 hover:bg-slate-800 text-[10px] py-1 px-2.5 text-slate-350 hover:text-white rounded border border-slate-800 cursor-pointer"
                              >
                                Refresh
                              </button>
                              <button 
                                type="button"
                                onClick={clearFirewallLogs}
                                className="bg-slate-900 hover:bg-rose-955/40 hover:text-rose-400 hover:border-rose-900/60 text-[10px] py-1 px-2.5 text-slate-400 rounded border border-slate-800 cursor-pointer"
                              >
                                Clear
                              </button>
                            </div>
                          </div>

                          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[290px] text-[11px] leading-relaxed">
                            {loadingFirewallLogs && firewallLogs.length === 0 ? (
                              <div className="text-slate-500 italic py-4 text-center">Reading kernel threat buffers...</div>
                            ) : firewallLogs.length === 0 ? (
                              <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
                                <span className="text-emerald-500 animate-ping text-lg font-bold">●</span>
                                <span className="text-slate-200 font-bold tracking-tight">STATUS: OPERATIONS NOMINAL</span>
                                <span className="text-[10px] text-slate-500 max-w-xs leading-normal">API gateway shield actively routing requests. No active infiltration attempts detected.</span>
                              </div>
                            ) : (
                              firewallLogs.map((log: any, idx: number) => (
                                <div key={idx} className="border-b border-slate-900/40 pb-1.5 mb-1.5 text-slate-300 hover:bg-slate-900/30 p-1 rounded">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                    <span className={`px-1.5 py-0.2 text-[8px] font-black rounded uppercase tracking-wider ${
                                      log.type === 'injection' ? 'bg-rose-950/60 text-rose-400 border border-rose-900/60' :
                                      log.type === 'rate-limit' ? 'bg-amber-950/60 text-amber-400 border border-amber-900/60' :
                                      'bg-slate-800 text-slate-300'
                                    }`}>
                                      {log.type}
                                    </span>
                                  </div>
                                  <div className="mt-1 flex items-center justify-between">
                                    <span className="font-extrabold text-white text-[11px]">{log.method} {log.path}</span>
                                    <span className="text-slate-400 font-semibold">{log.ip}</span>
                                  </div>
                                  <p className="text-rose-400 text-[10px] mt-0.5 max-w-sm truncate italic">{log.reason}</p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Threat Simulator box */}
                        <div className="bg-amber-500/5 border border-amber-500/15 p-3.5 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <h5 className="text-[11px] font-black uppercase text-amber-500 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> Threat Simulation Panel
                            </h5>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Test Resiliency</span>
                          </div>
                          <p className="text-[10px] text-slate-455 leading-normal text-left">
                            Verify firewall behavior on demand. Trigger an instant mock threat scan (e.g., query SQL/XSS block) to observe instant API blocking and real-time console logs.
                          </p>
                          
                          <button 
                            type="button"
                            onClick={async () => {
                              if (!firewallConfig.enabled) {
                                alert("Please enable the security shield and click 'Save & Activate' first to live-test simulated threats!");
                                return;
                              }
                              try {
                                // trigger code block string in parameters
                                const triggerUrl = `/api/v1/test?email=${encodeURIComponent(emailToUse)}&security_test_token=1&attack_vector=SELECT+*+FROM+users;--`;
                                const r = await fetch(triggerUrl);
                                const json = await r.json();
                                alert(`Simulated Test Outcome:\nResponse Status: ${r.status} (${r.status === 400 ? 'SUCCESSFULLY BLOCKED' : 'NOT BLOCKED'})\nBody Response: ${JSON.stringify(json)}`);
                                // Refresh
                                fetchFirewallLogs();
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500 text-amber-700 dark:text-amber-400 w-full font-bold py-2 rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Play className="w-3 h-3 fill-amber-500 text-amber-500" /> Simulate SQL Injection Threat
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button 
                        type="button"
                        onClick={() => saveConnectorForm('firewall')}
                        className="flex-1 bg-[#6366f1] text-white hover:bg-indigo-700 py-2.5 rounded-xl text-xs font-bold cursor-pointer border-0 shadow-sm"
                      >
                        Save & Activate Firewall settings
                      </button>
                    </div>

                    {firewallConfig.enabled && (
                      <button 
                        type="button"
                        onClick={() => disconnectConnectorAndClear('firewall')}
                        className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 font-bold py-2 rounded-xl text-xs cursor-pointer border-0 mt-1"
                      >
                        Disconnect Firewall / Disable Shield
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
