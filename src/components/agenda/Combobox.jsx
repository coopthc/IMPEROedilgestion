import React, { useState } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Combobox({
  value,
  onChange,
  items,
  placeholder = "Seleziona...",
  allowEmpty = true,
  emptyLabel = "—",
  icon: Icon,
}) {
  const [open, setOpen] = useState(false);
  const selected = items.find((c) => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              {Icon && <Icon className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
              <span className="truncate">{selected.label}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="w-3.5 h-3.5 opacity-50 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        align="start"
        style={{ width: "var(--radix-popover-trigger-width)" }}
      >
        <Command>
          <CommandInput placeholder="Cerca..." />
          <CommandList>
            <CommandEmpty>Nessun risultato.</CommandEmpty>
            <CommandGroup>
              {allowEmpty && (
                <CommandItem
                  value="__none__"
                  onSelect={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-1 w-4 h-4",
                      !value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {emptyLabel}
                </CommandItem>
              )}
              {items.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.label}
                  onSelect={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-1 w-4 h-4",
                      value === c.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{c.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}