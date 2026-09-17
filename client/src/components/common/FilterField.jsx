import { Info } from 'lucide-react';
import { Field, FieldLabel } from '@/components/ui/field';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { filterMeta } from '../../constants/filterMeta';

/**
 * Wraps one filter control in a permanent label plus a description of what it
 * narrows, so the dimension stays readable after a value replaces the
 * placeholder.
 *
 * The description hangs off an info icon rather than sitting under the control:
 * these bars carry up to eight filters, and a line of help text beneath each
 * one would push the actual data off the first screen.
 */
const FilterField = ({ name, label, description, children, className = '' }) => {
  const meta = filterMeta(name);
  const text = description ?? meta.description;

  return (
    <Field orientation="vertical" className={`w-auto gap-1 ${className}`}>
      <FieldLabel className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
        {label ?? meta.label}
        {text && (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  // Labels are not focus targets, so this button is the only way
                  // to reach the description by keyboard.
                  aria-label={`What does ${label ?? meta.label} filter?`}
                  className="text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
                >
                  <Info className="size-3" />
                </button>
              }
            />
            <TooltipContent side="top">{text}</TooltipContent>
          </Tooltip>
        )}
      </FieldLabel>
      {children}
    </Field>
  );
};

export default FilterField;
