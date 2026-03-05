import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export function DropdownMenuContent({ className, ...props }: DropdownMenuPrimitive.DropdownMenuContentProps) {
  return <DropdownMenuPrimitive.Content className={cn('z-50 min-w-[9rem] rounded-lg border bg-background p-1 shadow-lg', className)} {...props} />;
}

export function DropdownMenuItem({ className, ...props }: DropdownMenuPrimitive.DropdownMenuItemProps) {
  return <DropdownMenuPrimitive.Item className={cn('cursor-pointer rounded-md px-2 py-1.5 text-sm outline-none hover:bg-muted', className)} {...props} />;
}
