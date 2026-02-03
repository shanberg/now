/**
 * Shared path switch/create actions for list-focus and menu-bar-focus.
 * Renders from path context descriptors so visibility and labels stay in sync.
 */
import { Action, Icon, MenuBarExtra } from "@raycast/api";
import type {
  PathActionDescriptor,
  PathSwitchContext,
} from "./pathContext";
import { pathSwitchContextToDescriptors } from "./pathContext";

export type PathSwitchCallbacks = {
  "switch-global"?: () => void | Promise<void>;
  "switch-document"?: () => void | Promise<void>;
  "switch-app"?: () => void | Promise<void>;
  "create-document"?: () => void | Promise<void>;
  "create-app"?: () => void | Promise<void>;
};

function iconFor(id: PathActionDescriptor["id"]) {
  switch (id) {
    case "switch-global":
      return Icon.Circle;
    case "switch-document":
      return Icon.Document;
    case "switch-app":
      return Icon.AppWindow;
    case "create-document":
    case "create-app":
      return Icon.Plus;
    default:
      return Icon.Circle;
  }
}

export function PathSwitchActionsList({
  context,
  callbacks,
}: {
  context: PathSwitchContext;
  callbacks: PathSwitchCallbacks;
}) {
  const descriptors = pathSwitchContextToDescriptors(context);
  return (
    <>
      {descriptors.map((d: PathActionDescriptor) => {
        const onAction = d.id in callbacks ? callbacks[d.id] : undefined;
        if (!onAction) return null;
        return (
          <Action
            key={d.id}
            title={d.title}
            icon={iconFor(d.id)}
            onAction={onAction}
          />
        );
      })}
    </>
  );
}

export function PathSwitchActionsMenuBar({
  context,
  callbacks,
}: {
  context: PathSwitchContext;
  callbacks: PathSwitchCallbacks;
}) {
  const descriptors = pathSwitchContextToDescriptors(context);
  return (
    <>
      {descriptors.map((d: PathActionDescriptor) => {
        const onAction = d.id in callbacks ? callbacks[d.id] : undefined;
        if (!onAction) return null;
        return (
          <MenuBarExtra.Item
            key={d.id}
            title={d.title}
            onAction={onAction}
          />
        );
      })}
    </>
  );
}
