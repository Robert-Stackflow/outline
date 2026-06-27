import { observer } from "mobx-react";
import { SparklesIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import { AiApiFormat } from "@shared/types";
import Button from "~/components/Button";
import Heading from "~/components/Heading";
import Input from "~/components/Input";
import { InputSelect } from "~/components/InputSelect";
import Scene from "~/components/Scene";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { ActionRow } from "./components/ActionRow";
import SettingRow from "./components/SettingRow";

/**
 * Workspace settings for the AI assistant: provider endpoint, API key, model,
 * and prompt parameters.
 */
function AiSettings() {
  const { t } = useTranslation();
  const { ai } = useStores();
  const team = useCurrentTeam();
  const can = usePolicy(team);

  const [enabled, setEnabled] = React.useState(false);
  const [apiFormat, setApiFormat] = React.useState<string>(
    AiApiFormat.ChatCompletions
  );
  const [baseUrl, setBaseUrl] = React.useState("");
  const [model, setModel] = React.useState("");
  const [temperature, setTemperature] = React.useState("0.7");
  const [systemPrompt, setSystemPrompt] = React.useState("");
  const [apiKey, setApiKey] = React.useState("");
  const [hasApiKey, setHasApiKey] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    void ai.fetchConfig().then((config) => {
      setEnabled(config.enabled);
      setApiFormat(config.apiFormat || AiApiFormat.ChatCompletions);
      setBaseUrl(config.baseUrl);
      setModel(config.model);
      setTemperature(String(config.temperature ?? 0.7));
      setSystemPrompt(config.systemPrompt);
      setHasApiKey(config.hasApiKey);
    });
  }, [ai]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const config = await ai.updateConfig({
        enabled,
        apiFormat,
        baseUrl,
        model,
        temperature: Number(temperature) || 0.7,
        systemPrompt,
        ...(apiKey ? { apiKey } : {}),
      });
      setHasApiKey(config.hasApiKey);
      setApiKey("");
      toast.success(t("Settings saved"));
    } catch (_err) {
      toast.error(t("Failed to save settings"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Scene title={t("AI")} icon={<SparklesIcon />}>
      <Heading>{t("AI")}</Heading>
      <Text as="p" type="secondary">
        <Trans>
          Configure an OpenAI-compatible provider to enable the AI assistant,
          document summaries, and chat grounded in your knowledge base.
        </Trans>
      </Text>

      <form onSubmit={handleSubmit}>
        <SettingRow
          label={t("Enable AI assistant")}
          name="enabled"
          description={t(
            "Turn the AI assistant on for everyone in this workspace."
          )}
        >
          <Switch
            id="enabled"
            checked={enabled}
            onChange={setEnabled}
            disabled={!can.update}
          />
        </SettingRow>

        <SettingRow
          label={t("API format")}
          name="apiFormat"
          description={t(
            "The request format your provider expects. Use Chat Completions for OpenAI-compatible APIs, Messages for Anthropic, or Responses for the OpenAI Responses API."
          )}
        >
          <InputSelect
            label={t("API format")}
            labelHidden
            value={apiFormat}
            onChange={setApiFormat}
            disabled={!can.update}
            options={[
              { type: "item", label: "Chat Completions (OpenAI)", value: AiApiFormat.ChatCompletions },
              { type: "item", label: "Messages (Anthropic)", value: AiApiFormat.Messages },
              { type: "item", label: "Responses (OpenAI)", value: AiApiFormat.Responses },
            ]}
          />
        </SettingRow>

        <SettingRow
          label={t("API base URL")}
          name="baseUrl"
          description={t(
            "The OpenAI-compatible endpoint, e.g. https://api.openai.com/v1"
          )}
        >
          <Input
            id="baseUrl"
            value={baseUrl}
            placeholder="https://api.openai.com/v1"
            onChange={(e) => setBaseUrl(e.target.value)}
            disabled={!can.update}
          />
        </SettingRow>

        <SettingRow
          label={t("API key")}
          name="apiKey"
          description={
            hasApiKey
              ? t("An API key is configured. Enter a new one to replace it.")
              : t("The secret key used to authenticate with the provider.")
          }
        >
          <Input
            id="apiKey"
            type="password"
            value={apiKey}
            placeholder={hasApiKey ? "••••••••••••" : "sk-…"}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={!can.update}
          />
        </SettingRow>

        <SettingRow
          label={t("Model")}
          name="model"
          description={t("The model identifier, e.g. gpt-4o-mini")}
        >
          <Input
            id="model"
            value={model}
            placeholder="gpt-4o-mini"
            onChange={(e) => setModel(e.target.value)}
            disabled={!can.update}
          />
        </SettingRow>

        <SettingRow
          label={t("Temperature")}
          name="temperature"
          description={t("Sampling temperature between 0 and 2.")}
        >
          <Input
            id="temperature"
            type="text"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            disabled={!can.update}
          />
        </SettingRow>

        <SettingRow
          label={t("System prompt")}
          name="systemPrompt"
          description={t(
            "Instructions prepended to every conversation to steer the assistant."
          )}
        >
          <Input
            id="systemPrompt"
            type="textarea"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            disabled={!can.update}
          />
        </SettingRow>

        {can.update && (
          <ActionRow>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? `${t("Saving")}…` : t("Save")}
            </Button>
          </ActionRow>
        )}
      </form>
    </Scene>
  );
}

export default observer(AiSettings);
