import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { observer } from "mobx-react";
import {
  BrowserIcon,
  CheckmarkIcon,
  DocumentIcon,
  EmailIcon,
  KeyboardIcon,
  LightBulbIcon,
  LogoutIcon,
  MoonIcon,
  MoreIcon,
  PlusIcon,
  ProfileIcon,
  SettingsIcon,
  SunIcon,
  UserIcon,
  UserAddIcon,
  WarningIcon,
} from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import styled, { css } from "styled-components";
import { stringToColor } from "@shared/utils/color";
import { UrlHelper } from "@shared/utils/UrlHelper";
import { s } from "@shared/styles";
import { Avatar, AvatarSize } from "~/components/Avatar";
import TeamLogo from "~/components/TeamLogo";
import * as Components from "~/components/primitives/components/Menu";
import TeamNew from "~/scenes/TeamNew";
import useActionContext from "~/hooks/useActionContext";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import { inviteUser } from "~/actions/definitions/users";
import { Theme } from "~/stores/UiStore";
import { settingsPath } from "~/utils/routeHelpers";
import { preventDefault } from "~/utils/events";

const HEIGHT_VAR = "--radix-dropdown-menu-content-available-height";
const ORIGIN_VAR = "--radix-dropdown-menu-content-transform-origin";
const SUB_HEIGHT_VAR = "--radix-dropdown-menu-content-available-height";
const SUB_ORIGIN_VAR = "--radix-dropdown-menu-content-transform-origin";

type Props = {
  children?: React.ReactNode;
};

/**
 * Workspace + account menu. Built on Radix dropdown primitives but renders
 * each row through the shared Menu styled components (MenuButton,
 * MenuIconWrapper, MenuLabel, MenuSeparator, MenuSubTrigger, MenuDisclosure)
 * so the visual language matches every other context menu in the app.
 */
const TeamMenu: React.FC<Props> = ({ children }) => {
  const { t } = useTranslation();
  const history = useHistory();
  const { auth, dialogs, policies, ui } = useStores();
  const team = useCurrentTeam();
  const teamAbilities = policies.abilities(team.id);
  const canCreateTeam = teamAbilities.createTeam;
  const canUpdateTeam = teamAbilities.update;
  const user = useCurrentUser();
  const context = useActionContext({ isMenu: true });
  const [open, setOpen] = React.useState(false);

  const close = React.useCallback(() => setOpen(false), []);

  const handleSettings = React.useCallback(() => {
    history.push(
      canUpdateTeam ? settingsPath("details") : settingsPath("members")
    );
    close();
  }, [canUpdateTeam, history, close]);

  const handleInvite = React.useCallback(
    (event: React.MouseEvent) => {
      inviteUser.perform({ ...context, event: event.nativeEvent });
      close();
    },
    [context, close]
  );

  const handleNewWorkspace = React.useCallback(() => {
    if (auth.user) {
      dialogs.openModal({
        title: t("Create a workspace"),
        content: <TeamNew user={auth.user} />,
      });
    }
    close();
  }, [auth.user, dialogs, t, close]);

  const handleLogout = React.useCallback(async () => {
    close();
    await auth.logout({ savePath: false });
  }, [auth, close]);

  const otherTeams = auth.availableTeams?.filter((s) => s.id !== team.id) ?? [];

  return (
    <DropdownMenuPrimitive.Root open={open} onOpenChange={setOpen}>
      <DropdownMenuPrimitive.Trigger asChild>
        {children}
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="start"
          sideOffset={6}
          collisionPadding={8}
          onCloseAutoFocus={preventDefault}
          asChild
        >
          <WideContent
            maxHeightVar={HEIGHT_VAR}
            transformOriginVar={ORIGIN_VAR}
            hiddenScrollbars
          >
            <WorkspaceCard>
              <TeamLogo model={team} size={40} alt={team.name} />
              <WorkspaceMeta>
                <WorkspaceName>{team.name}</WorkspaceName>
                <WorkspaceSubtitle>
                  {t("{{ count }} member", { count: team.memberCount ?? 1 })}
                </WorkspaceSubtitle>
              </WorkspaceMeta>
            </WorkspaceCard>

            <ActionRow>
              <ActionButton type="button" onClick={handleSettings}>
                {canUpdateTeam ? (
                  <SettingsIcon size={18} />
                ) : (
                  <UserIcon size={18} />
                )}
                <span>{canUpdateTeam ? t("Settings") : t("Members")}</span>
              </ActionButton>
              <ActionButton type="button" onClick={handleInvite}>
                <UserAddIcon size={18} />
                <span>{t("Invite people")}</span>
              </ActionButton>
            </ActionRow>

            <Components.MenuSeparator />

            <SectionLabel>{t("Workspace")}</SectionLabel>

            {/* Current workspace */}
            <DropdownMenuPrimitive.Item asChild onSelect={close}>
              <QuietMenuButton>
                <SwitchLogoWrapper>
                  <TeamLogo model={team} size={20} alt={team.name} />
                </SwitchLogoWrapper>
                <Components.MenuLabel>{team.name}</Components.MenuLabel>
                <Components.SelectedIconWrapper aria-hidden>
                  <CheckmarkIcon size={18} />
                </Components.SelectedIconWrapper>
              </QuietMenuButton>
            </DropdownMenuPrimitive.Item>

            {otherTeams.map((session) => (
              <DropdownMenuPrimitive.Item
                asChild
                key={session.id}
                onSelect={(event) => {
                  // Switch the active workspace in-place via the multi-session
                  // endpoint rather than navigating to a (same-host) URL.
                  event.preventDefault();
                  close();
                  void auth.switchTeam(session.id);
                }}
              >
                <QuietMenuButton type="button">
                  <SwitchLogoWrapper>
                    <TeamLogo
                      model={{
                        initial: session.name[0],
                        avatarUrl: session.avatarUrl,
                        id: session.id,
                        color: stringToColor(session.id),
                      }}
                      size={20}
                      alt={session.name}
                    />
                  </SwitchLogoWrapper>
                  <Components.MenuLabel>{session.name}</Components.MenuLabel>
                </QuietMenuButton>
              </DropdownMenuPrimitive.Item>
            ))}

            {canCreateTeam && (
              <DropdownMenuPrimitive.Item asChild onSelect={handleNewWorkspace}>
                <QuietMenuButton>
                  <Components.MenuIconWrapper>
                    <PlusIcon size={18} />
                  </Components.MenuIconWrapper>
                  <Components.MenuLabel>
                    {t("New workspace")}
                  </Components.MenuLabel>
                </QuietMenuButton>
              </DropdownMenuPrimitive.Item>
            )}

            <Components.MenuSeparator />

            <SectionLabel>{t("Account")}</SectionLabel>

            <UserRow>
              <Avatar model={user} size={AvatarSize.Medium} />
              <UserMeta>
                <UserName>{user.name}</UserName>
                <UserEmail>{user.email}</UserEmail>
              </UserMeta>
              <AccountSubmenu onAfterAction={close} ui={ui} />
            </UserRow>

            <DropdownMenuPrimitive.Item asChild onSelect={handleLogout}>
              <QuietMenuButton>
                <Components.MenuIconWrapper>
                  <LogoutIcon size={18} />
                </Components.MenuIconWrapper>
                <Components.MenuLabel>{t("Log out")}</Components.MenuLabel>
              </QuietMenuButton>
            </DropdownMenuPrimitive.Item>
          </WideContent>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
};

/**
 * Trailing "..." menu next to the user row. Hosts the legacy AccountMenu
 * items (profile, preferences, theme, keyboard shortcuts, docs, feedback) so
 * the main panel keeps its Notion-like simplicity.
 */
const AccountSubmenu: React.FC<{
  onAfterAction: () => void;
  ui: { theme: string; setTheme: (theme: Theme) => void };
}> = ({ onAfterAction, ui }) => {
  const { t } = useTranslation();
  const history = useHistory();

  const go = (path: string) => () => {
    history.push(path);
    onAfterAction();
  };

  const external = (url: string) => () => {
    window.open(url, "_blank", "noopener");
    onAfterAction();
  };

  const setTheme = (theme: Theme) => () => {
    ui.setTheme(theme);
    onAfterAction();
  };

  return (
    <DropdownMenuPrimitive.Sub>
      <DropdownMenuPrimitive.SubTrigger asChild>
        <MoreButton aria-label={t("Account menu")}>
          <MoreIcon size={18} />
        </MoreButton>
      </DropdownMenuPrimitive.SubTrigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.SubContent
          sideOffset={4}
          collisionPadding={6}
          asChild
        >
          <Components.MenuContent
            maxHeightVar={SUB_HEIGHT_VAR}
            transformOriginVar={SUB_ORIGIN_VAR}
            hiddenScrollbars
          >
            <DropdownMenuPrimitive.Item
              asChild
              onSelect={go(settingsPath("profile"))}
            >
              <QuietMenuButton>
                <Components.MenuIconWrapper>
                  <ProfileIcon size={18} />
                </Components.MenuIconWrapper>
                <Components.MenuLabel>{t("Profile")}</Components.MenuLabel>
              </QuietMenuButton>
            </DropdownMenuPrimitive.Item>
            <DropdownMenuPrimitive.Item
              asChild
              onSelect={go(settingsPath("preferences"))}
            >
              <QuietMenuButton>
                <Components.MenuIconWrapper>
                  <SettingsIcon size={18} />
                </Components.MenuIconWrapper>
                <Components.MenuLabel>{t("Preferences")}</Components.MenuLabel>
              </QuietMenuButton>
            </DropdownMenuPrimitive.Item>
            <DropdownMenuPrimitive.Item
              asChild
              onSelect={go(settingsPath("notifications"))}
            >
              <QuietMenuButton>
                <Components.MenuIconWrapper>
                  <EmailIcon size={18} />
                </Components.MenuIconWrapper>
                <Components.MenuLabel>
                  {t("Notifications")}
                </Components.MenuLabel>
              </QuietMenuButton>
            </DropdownMenuPrimitive.Item>

            <Components.MenuSeparator />

            {/* Appearance → submenu */}
            <DropdownMenuPrimitive.Sub>
              <DropdownMenuPrimitive.SubTrigger asChild>
                <QuietMenuSubTrigger>
                  <Components.MenuIconWrapper>
                    <SunIcon size={18} />
                  </Components.MenuIconWrapper>
                  <Components.MenuLabel>{t("Appearance")}</Components.MenuLabel>
                  <Components.MenuDisclosure />
                </QuietMenuSubTrigger>
              </DropdownMenuPrimitive.SubTrigger>
              <DropdownMenuPrimitive.Portal>
                <DropdownMenuPrimitive.SubContent
                  sideOffset={4}
                  collisionPadding={6}
                  asChild
                >
                  <Components.MenuContent
                    maxHeightVar={SUB_HEIGHT_VAR}
                    transformOriginVar={SUB_ORIGIN_VAR}
                    hiddenScrollbars
                  >
                    <DropdownMenuPrimitive.Item
                      asChild
                      onSelect={setTheme(Theme.Light)}
                    >
                      <QuietMenuButton>
                        <Components.MenuIconWrapper>
                          <SunIcon size={18} />
                        </Components.MenuIconWrapper>
                        <Components.MenuLabel>
                          {t("Light")}
                        </Components.MenuLabel>
                        <Components.SelectedIconWrapper aria-hidden>
                          {ui.theme === Theme.Light ? (
                            <CheckmarkIcon size={18} />
                          ) : null}
                        </Components.SelectedIconWrapper>
                      </QuietMenuButton>
                    </DropdownMenuPrimitive.Item>
                    <DropdownMenuPrimitive.Item
                      asChild
                      onSelect={setTheme(Theme.Dark)}
                    >
                      <QuietMenuButton>
                        <Components.MenuIconWrapper>
                          <MoonIcon size={18} />
                        </Components.MenuIconWrapper>
                        <Components.MenuLabel>{t("Dark")}</Components.MenuLabel>
                        <Components.SelectedIconWrapper aria-hidden>
                          {ui.theme === Theme.Dark ? (
                            <CheckmarkIcon size={18} />
                          ) : null}
                        </Components.SelectedIconWrapper>
                      </QuietMenuButton>
                    </DropdownMenuPrimitive.Item>
                    <DropdownMenuPrimitive.Item
                      asChild
                      onSelect={setTheme(Theme.System)}
                    >
                      <QuietMenuButton>
                        <Components.MenuIconWrapper>
                          <BrowserIcon size={18} />
                        </Components.MenuIconWrapper>
                        <Components.MenuLabel>
                          {t("System")}
                        </Components.MenuLabel>
                        <Components.SelectedIconWrapper aria-hidden>
                          {ui.theme === Theme.System ? (
                            <CheckmarkIcon size={18} />
                          ) : null}
                        </Components.SelectedIconWrapper>
                      </QuietMenuButton>
                    </DropdownMenuPrimitive.Item>
                  </Components.MenuContent>
                </DropdownMenuPrimitive.SubContent>
              </DropdownMenuPrimitive.Portal>
            </DropdownMenuPrimitive.Sub>

            <DropdownMenuPrimitive.Item asChild onSelect={onAfterAction}>
              <QuietMenuButton>
                <Components.MenuIconWrapper>
                  <KeyboardIcon size={18} />
                </Components.MenuIconWrapper>
                <Components.MenuLabel>
                  {t("Keyboard shortcuts")}
                </Components.MenuLabel>
              </QuietMenuButton>
            </DropdownMenuPrimitive.Item>

            <Components.MenuSeparator />

            <DropdownMenuPrimitive.Item
              asChild
              onSelect={external(UrlHelper.guide)}
            >
              <QuietMenuButton>
                <Components.MenuIconWrapper>
                  <DocumentIcon size={18} />
                </Components.MenuIconWrapper>
                <Components.MenuLabel>
                  {t("Documentation")}
                </Components.MenuLabel>
              </QuietMenuButton>
            </DropdownMenuPrimitive.Item>
            <DropdownMenuPrimitive.Item
              asChild
              onSelect={external(UrlHelper.developers)}
            >
              <QuietMenuButton>
                <Components.MenuIconWrapper>
                  <DocumentIcon size={18} />
                </Components.MenuIconWrapper>
                <Components.MenuLabel>
                  {t("API documentation")}
                </Components.MenuLabel>
              </QuietMenuButton>
            </DropdownMenuPrimitive.Item>
            <DropdownMenuPrimitive.Item
              asChild
              onSelect={external(UrlHelper.changelog)}
            >
              <QuietMenuButton>
                <Components.MenuIconWrapper>
                  <LightBulbIcon size={18} />
                </Components.MenuIconWrapper>
                <Components.MenuLabel>{t("Changelog")}</Components.MenuLabel>
              </QuietMenuButton>
            </DropdownMenuPrimitive.Item>

            <Components.MenuSeparator />

            <DropdownMenuPrimitive.Item
              asChild
              onSelect={external(UrlHelper.contact)}
            >
              <QuietMenuButton>
                <Components.MenuIconWrapper>
                  <EmailIcon size={18} />
                </Components.MenuIconWrapper>
                <Components.MenuLabel>
                  {t("Send us feedback")}
                </Components.MenuLabel>
              </QuietMenuButton>
            </DropdownMenuPrimitive.Item>
            <DropdownMenuPrimitive.Item
              asChild
              onSelect={external(UrlHelper.github)}
            >
              <QuietMenuButton>
                <Components.MenuIconWrapper>
                  <WarningIcon size={18} />
                </Components.MenuIconWrapper>
                <Components.MenuLabel>{t("Report a bug")}</Components.MenuLabel>
              </QuietMenuButton>
            </DropdownMenuPrimitive.Item>
          </Components.MenuContent>
        </DropdownMenuPrimitive.SubContent>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Sub>
  );
};

const WorkspaceCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px 12px;
`;

const WideContent = styled(Components.MenuContent)`
  min-width: 320px;
  max-width: 360px;
  padding: 6px;
`;

/**
 * Quiet override of the shared menu item styles: keeps spacing/typography in
 * sync with the rest of the app, but swaps the loud accent hover for the
 * subtle list-item hover used in the breadcrumb chevron menus. Applied to all
 * rows in this menu so workspace switching and account actions feel calm.
 */
const quietHover = css`
  &[data-highlighted],
  &[data-state="open"],
  &:hover,
  &:focus-visible {
    color: ${(props) => props.theme.text} !important;
    background: ${(props) => props.theme.listItemHoverBackground} !important;
    outline: 0;

    svg:not([data-fixed-color]) {
      color: ${(props) => props.theme.textSecondary} !important;
      fill: none !important;
    }
  }
`;

const QuietMenuButton = styled(Components.MenuButton)`
  ${quietHover}
`;

const QuietMenuSubTrigger = styled(Components.MenuSubTrigger)`
  ${quietHover}
`;

const WorkspaceMeta = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const WorkspaceName = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${s("text")};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const WorkspaceSubtitle = styled.span`
  font-size: 12px;
  color: ${s("textTertiary")};
  margin-top: 2px;
  display: inline-flex;
  align-items: center;
`;

const ActionRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 0 8px 8px;
`;

const ActionButton = styled.button`
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 4px;
  background: transparent;
  border: 1px solid ${s("divider")};
  color: ${s("text")};
  font-size: 13px;
  font-weight: 500;
  cursor: var(--pointer);
  transition:
    background 120ms ease,
    border-color 120ms ease;

  svg {
    color: ${s("textSecondary")};
    flex-shrink: 0;
  }

  &:hover {
    background: ${s("listItemHoverBackground")};
    border-color: ${s("buttonNeutralBorder")};
  }
`;

const UserRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px 8px;
  color: ${s("textSecondary")};
`;

const UserMeta = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

const UserName = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: ${s("text")};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const UserEmail = styled.span`
  font-size: 12px;
  color: ${s("textTertiary")};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SectionLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${s("textTertiary")};
  padding: 6px 12px 4px;
  user-select: none;
`;

const MoreButton = styled.button.attrs({ type: "button" })`
  appearance: none;
  background: transparent;
  border: 0;
  outline: 0;
  padding: 2px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: var(--pointer);
  color: ${s("textTertiary")};
  transition:
    background 120ms ease,
    color 120ms ease;

  &:focus,
  &:focus-visible {
    outline: 0;
    box-shadow: none;
  }

  &:hover,
  &[data-state="open"] {
    background: ${s("listItemHoverBackground")};
    color: ${s("text")};
  }
`;

const SwitchLogoWrapper = styled.span`
  width: 24px;
  height: 24px;
  margin-inline-end: 6px;
  margin-inline-start: -4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

export default observer(TeamMenu);
