import { t } from "i18next";
import { action } from "mobx";
import type { CommandFactory } from "@shared/editor/lib/Extension";
import type { WidgetProps } from "@shared/editor/lib/Extension";
import { PlaceholderPlugin } from "@shared/editor/plugins/PlaceholderPlugin";
import Suggestion from "~/editor/extensions/Suggestion";
import BlockMenu from "../components/BlockMenu";

export default class BlockMenuExtension extends Suggestion {
  get defaultOptions() {
    return {
      trigger: "/",
      allowSpaces: false,
      requireSearchTerm: false,
      enabledInCode: false,
      enabledInMarks: false,
    };
  }

  get name() {
    return "block-menu";
  }

  get plugins() {
    return [
      ...super.plugins,
      new PlaceholderPlugin([
        {
          condition: ({ node, $start, textContent, state }) =>
            $start.depth === 1 &&
            state.selection.$from.pos === $start.pos + node.content.size &&
            !!textContent &&
            node.childCount === 0 &&
            node.textContent === "",
          text: `${t("Type '/' to insert")}…`,
        },
        {
          condition: ({ node, $start, state }) =>
            $start.depth === 1 &&
            state.selection.$from.pos === $start.pos + node.content.size &&
            node.textContent === "/" &&
            node.firstChild?.marks.length === 0,
          text: `  ${t("Keep typing to filter")}…`,
        },
      ]),
    ];
  }

  private handleClose = action((insertNewLine: boolean) => {
    const { view } = this.editor;

    if (insertNewLine) {
      const transaction = view.state.tr.split(view.state.selection.to);
      view.dispatch(transaction);
      view.focus();
    }

    this.state.open = false;
  });

  /**
   * Returns commands owned by the block menu extension.
   *
   * @returns editor commands that can open the block menu.
   */
  commands(): Record<string, CommandFactory> {
    return {
      openBlockMenu: () => (state, dispatch) => {
        const trigger = Array.isArray(this.options.trigger)
          ? this.options.trigger[0]
          : this.options.trigger;

        dispatch?.(state.tr.insertText(trigger));

        action(() => {
          this.state.query = "";
          this.state.open = true;
        })();

        return true;
      },
    };
  }

  widget = ({ rtl }: WidgetProps) => {
    const { props } = this.editor;

    return (
      <BlockMenu
        rtl={rtl}
        trigger={this.options.trigger}
        isActive={this.state.open}
        search={this.state.query}
        onClose={this.handleClose}
        uploadFile={props.uploadFile}
        onFileUploadStart={props.onFileUploadStart}
        onFileUploadStop={props.onFileUploadStop}
        onFileUploadProgress={props.onFileUploadProgress}
        embeds={props.embeds}
      />
    );
  };
}
