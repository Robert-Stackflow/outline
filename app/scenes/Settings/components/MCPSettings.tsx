import { observer } from "mobx-react";
import { CopyIcon } from "outline-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useTheme } from "styled-components";
import { TeamPreference } from "@shared/types";
import { TeamValidation } from "@shared/validations";
import CopyToClipboard from "~/components/CopyToClipboard";
import Input from "~/components/Input";
import NudeButton from "~/components/NudeButton";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import Tooltip from "~/components/Tooltip";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import SettingRow from "./SettingRow";

/**
 * Renders workspace-level AI integration controls, including MCP access.
 *
 * @returns the MCP settings rows.
 */
export const MCPSettings = observer(function MCPSettings() {
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const can = usePolicy(team);
  const theme = useTheme();
  const mcpEnabled = team.getPreference(TeamPreference.MCP);

  const handleMCPChange = React.useCallback(
    async (checked: boolean) => {
      if (!can.update) {
        return;
      }

      team.setPreference(TeamPreference.MCP, checked);
      await team.save();
      toast.success(t("Settings saved"));
    },
    [can.update, team, t]
  );

  const handleGuidanceMCPChange = React.useCallback(
    async (ev: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!can.update) {
        return;
      }

      team.guidanceMCP = ev.target.value || null;
    },
    [can.update, team]
  );

  const handleGuidanceMCPBlur = React.useCallback(async () => {
    if (!can.update) {
      return;
    }

    await team.save();
    toast.success(t("Settings saved"));
  }, [can.update, team, t]);

  const handleCopied = React.useCallback(() => {
    toast.success(t("Copied to clipboard"));
  }, [t]);

  const mcpEndpoint = `${window.location.origin}/mcp`;

  return (
    <>
      <SettingRow
        name={TeamPreference.MCP}
        label={t("MCP server")}
        border={!mcpEnabled}
        description={
          <>
            <Text type="secondary" as="p">
              {t(
                "Allow members to connect to this workspace with MCP to read and write data."
              )}
            </Text>
            {mcpEnabled && (
              <>
                <Text
                  type="secondary"
                  as="p"
                  style={{ marginTop: 8, marginBottom: 4 }}
                >
                  <Trans
                    defaults="Use the following endpoint to connect to the MCP server from your app. Find out more about setup in <a>the docs</a>."
                    components={{
                      a: (
                        <Text
                          as="a"
                          weight="bold"
                          href="https://docs.getoutline.com/s/guide/doc/mcp-6j9jtENNKL"
                          target="_blank"
                          rel="noopener noreferrer"
                        />
                      ),
                    }}
                  />
                </Text>
                <Input readOnly value={mcpEndpoint}>
                  <Tooltip content={t("Copy URL")} placement="top">
                    <CopyToClipboard text={mcpEndpoint} onCopy={handleCopied}>
                      <NudeButton type="button" style={{ marginRight: 3 }}>
                        <CopyIcon color={theme.placeholder} size={18} />
                      </NudeButton>
                    </CopyToClipboard>
                  </Tooltip>
                </Input>
              </>
            )}
          </>
        }
      >
        <Switch
          id={TeamPreference.MCP}
          name={TeamPreference.MCP}
          checked={mcpEnabled}
          onChange={handleMCPChange}
          disabled={!can.update}
        />
      </SettingRow>

      {mcpEnabled && (
        <SettingRow
          name="guidanceMCP"
          label={t("Additional guidance")}
          description={
            <>
              <div style={{ marginBottom: 8 }}>
                {t(
                  "You can use these optional instructions to tell MCP clients how to use your knowledge base."
                )}
              </div>
              <Input
                id="guidanceMCP"
                type="textarea"
                autoSize
                minHeight="6lh"
                maxHeight="20lh"
                value={team.guidanceMCP ?? ""}
                maxLength={TeamValidation.maxGuidanceMCPLength}
                warningLimit={TeamValidation.warnGuidanceMCPLength}
                onChange={handleGuidanceMCPChange}
                onBlur={handleGuidanceMCPBlur}
                disabled={!can.update}
              />
            </>
          }
        />
      )}
    </>
  );
});
