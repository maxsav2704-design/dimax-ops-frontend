import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
type ToasterProps = React.ComponentProps<typeof Sonner>;
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:border-border group-[.toaster]:bg-surface group-[.toaster]:text-text",
          description: "group-[.toast]:text-text-secondary",
          actionButton:
            "group-[.toast]:bg-accent group-[.toast]:text-accent-foreground",
          cancelButton:
            "group-[.toast]:bg-surface-sunken group-[.toast]:text-text-secondary",
        },
      }}
      {...props}
    />
  );
};
export { Toaster, toast };
