import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

type SheetContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  side?: 'left' | 'right';
};

export const SheetContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, SheetContentProps>(
  ({ className, children, side = 'right', ...props }, ref) => {
    const sideClassName = side === 'left' ? 'left-0 border-r border-l-0' : 'right-0 border-l';

    return (
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          ref={ref}
          className={cn('crm-sheet-content fixed inset-y-0 z-50 h-full w-full max-w-2xl bg-background p-5 shadow-xl', sideClassName, className)}
          {...props}
        >
          {children}
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/5 p-2 text-slate-100 ring-focus transition hover:bg-white/10">
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    );
  },
);
SheetContent.displayName = 'SheetContent';
