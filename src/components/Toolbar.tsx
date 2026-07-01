export interface ToolbarAction {
  readonly disabled?: boolean;
  readonly hidden?: boolean;
  readonly id: string;
  readonly label: string;
  readonly title?: string;
}

export interface ToolbarProps {
  readonly actions: readonly ToolbarAction[];
  readonly className?: string;
}

export function Toolbar({ actions, className = "menu" }: ToolbarProps): JSX.Element {
  return (
    <nav class={className}>
      {actions
        .filter((action) => !action.hidden)
        .map((action) => (
          <button
            class={`ico ${action.id}`}
            data-action={action.id}
            disabled={action.disabled === true}
            title={action.title ?? action.label}
            type="button"
          >
            {action.label}
          </button>
        ))}
    </nav>
  );
}

