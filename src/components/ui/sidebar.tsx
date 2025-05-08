
"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { VariantProps, cva } from "class-variance-authority"
import { PanelLeft } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const SIDEBAR_COOKIE_NAME_STATE = "sidebar_state"
const SIDEBAR_COOKIE_NAME_WIDTH = "sidebar_width"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days
const SIDEBAR_DEFAULT_WIDTH_PX = 256 // Default expanded width in pixels (approx 16rem)
const SIDEBAR_MIN_WIDTH_PERCENT = 15
const SIDEBAR_MAX_WIDTH_PERCENT = 50
const SIDEBAR_WIDTH_MOBILE = "18rem"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"

type SidebarContext = {
  state: "expanded" | "collapsed"
  open: boolean // Controls expanded/collapsed state on desktop
  setOpen: (open: boolean) => void
  openMobile: boolean // Controls sheet visibility on mobile
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
  expandedWidth: number // Width in pixels when expanded
  setExpandedWidth: (width: number) => void
  isResizing: boolean
  startResizing: () => void
}

const SidebarContext = React.createContext<SidebarContext | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }

  return context
}

// Helper function to get initial width from cookie or default
const getInitialWidth = (): number => {
  if (typeof document === 'undefined') return SIDEBAR_DEFAULT_WIDTH_PX;
  const widthCookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${SIDEBAR_COOKIE_NAME_WIDTH}=`))
    ?.split('=')[1];
  const parsedWidth = widthCookie ? parseInt(widthCookie, 10) : NaN;
  return !isNaN(parsedWidth) && parsedWidth > 0 ? parsedWidth : SIDEBAR_DEFAULT_WIDTH_PX;
}

// Helper function to get initial state from cookie or default
const getInitialState = (defaultOpen: boolean): boolean => {
    if (typeof document === 'undefined') return defaultOpen;
    const stateCookie = document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${SIDEBAR_COOKIE_NAME_STATE}=`))
        ?.split('=')[1];
    return stateCookie ? stateCookie === 'true' : defaultOpen;
};


const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    defaultOpen?: boolean
    open?: boolean
    onOpenChange?: (open: boolean) => void
  }
>(
  (
    {
      defaultOpen = true,
      open: openProp,
      onOpenChange: setOpenProp,
      className,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const isMobile = useIsMobile()
    const [openMobile, setOpenMobile] = React.useState(false)
    const [isResizing, setIsResizing] = React.useState(false)

    // State for expanded/collapsed
    const [_open, _setOpen] = React.useState(() => getInitialState(defaultOpen))
    const open = openProp ?? _open

     // State for expanded width
     const [expandedWidth, setExpandedWidthState] = React.useState<number>(getInitialWidth)

    const setOpen = React.useCallback(
      (value: boolean | ((value: boolean) => boolean)) => {
        const openState = typeof value === "function" ? value(open) : value
        if (setOpenProp) {
          setOpenProp(openState)
        } else {
          _setOpen(openState)
        }
         if (typeof document !== 'undefined') {
            document.cookie = `${SIDEBAR_COOKIE_NAME_STATE}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
         }
      },
      [setOpenProp, open]
    )

     const setExpandedWidth = React.useCallback((width: number) => {
         const minWidthPx = (window.innerWidth * SIDEBAR_MIN_WIDTH_PERCENT) / 100;
         const maxWidthPx = (window.innerWidth * SIDEBAR_MAX_WIDTH_PERCENT) / 100;
         const newWidth = Math.max(minWidthPx, Math.min(maxWidthPx, width));
         setExpandedWidthState(newWidth);
     }, []);

     // Persist width changes
     const persistWidth = React.useCallback((width: number) => {
        if (typeof document !== 'undefined') {
            document.cookie = `${SIDEBAR_COOKIE_NAME_WIDTH}=${Math.round(width)}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
        }
     }, []);


    // Helper to toggle the sidebar state
    const toggleSidebar = React.useCallback(() => {
      return isMobile
        ? setOpenMobile((open) => !open)
        : setOpen((open) => !open)
    }, [isMobile, setOpen, setOpenMobile])

     // Handle resizing logic
     const startResizing = React.useCallback(() => {
         if (isMobile) return; // Resizing not supported on mobile view
         setIsResizing(true);
         document.body.style.cursor = 'ew-resize'; // Set cursor for resizing
         document.body.style.userSelect = 'none'; // Prevent text selection during resize
     }, [isMobile]);

     const stopResizing = React.useCallback(() => {
         setIsResizing(false);
         document.body.style.cursor = '';
         document.body.style.userSelect = '';
         persistWidth(expandedWidth); // Persist final width
     }, [persistWidth, expandedWidth]);

     const handleMouseMove = React.useCallback((event: MouseEvent) => {
         if (!isResizing) return;
         // Calculate new width based on mouse position
         // Assuming sidebar is on the left for simplicity, adjust if needed
         const newWidth = event.clientX;
         setExpandedWidth(newWidth);
     }, [isResizing, setExpandedWidth]);


     React.useEffect(() => {
         if (isResizing) {
             window.addEventListener('mousemove', handleMouseMove);
             window.addEventListener('mouseup', stopResizing);
         } else {
             window.removeEventListener('mousemove', handleMouseMove);
             window.removeEventListener('mouseup', stopResizing);
         }

         return () => {
             window.removeEventListener('mousemove', handleMouseMove);
             window.removeEventListener('mouseup', stopResizing);
             // Clean up body styles if component unmounts while resizing
             if (isResizing) {
                 document.body.style.cursor = '';
                 document.body.style.userSelect = '';
             }
         };
     }, [isResizing, handleMouseMove, stopResizing]);



    // Adds a keyboard shortcut to toggle the sidebar.
    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (
          event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
          (event.metaKey || event.ctrlKey)
        ) {
          event.preventDefault()
          toggleSidebar()
        }
      }

      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }, [toggleSidebar])

    // We add a state so that we can do data-state="expanded" or "collapsed".
    // This makes it easier to style the sidebar with Tailwind classes.
    const state = open ? "expanded" : "collapsed"

    const contextValue = React.useMemo<SidebarContext>(
      () => ({
        state,
        open,
        setOpen,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
        expandedWidth,
        setExpandedWidth: setExpandedWidthState, // Pass down the direct setter
        isResizing,
        startResizing,
      }),
      [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar, expandedWidth, setExpandedWidthState, isResizing, startResizing]
    )

    return (
      <SidebarContext.Provider value={contextValue}>
        <TooltipProvider delayDuration={0}>
          <div
            style={
              {
                // Pass dynamic width as CSS variable if needed, or use directly in Sidebar component
                "--sidebar-expanded-width": `${expandedWidth}px`,
                "--sidebar-width-mobile": SIDEBAR_WIDTH_MOBILE,
                 // Set collapsed width using vw for responsiveness
                "--sidebar-collapsed-width": `${SIDEBAR_MIN_WIDTH_PERCENT}vw`,
                ...style,
              } as React.CSSProperties
            }
            className={cn(
              "group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar",
              isResizing && "cursor-ew-resize", // Add resizing cursor to wrapper
              className
            )}
            ref={ref}
            {...props}
          >
            {children}
          </div>
        </TooltipProvider>
      </SidebarContext.Provider>
    )
  }
)
SidebarProvider.displayName = "SidebarProvider"

const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    side?: "left" | "right"
    variant?: "sidebar" | "floating" | "inset"
    collapsible?: "offcanvas" | "icon" | "none" // 'icon' is now '15%'
  }
>(
  (
    {
      side = "left",
      variant = "sidebar",
      collapsible = "offcanvas", // Default collapsible behavior
      className,
      children,
      ...props
    },
    ref
  ) => {
    const { isMobile, state, openMobile, setOpenMobile, expandedWidth } = useSidebar()
    const isCollapsibleIcon = collapsible === "icon"; // Treat 'icon' as the resizable type

    // Calculate collapsed width in pixels for precise control if needed, or use vw
    const collapsedWidthVw = `${SIDEBAR_MIN_WIDTH_PERCENT}vw`;
    const currentExpandedWidthPx = `${expandedWidth}px`;


    if (collapsible === "none") {
      // Non-collapsible sidebar (always expanded)
      return (
        <div
          className={cn(
            "flex h-full flex-col bg-sidebar text-sidebar-foreground",
            className
          )}
           style={{ width: currentExpandedWidthPx }} // Always use expanded width
          ref={ref}
          {...props}
        >
          {children}
        </div>
      )
    }


    if (isMobile) {
      // Mobile view using Sheet
      return (
        <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
          <SheetContent
            data-sidebar="sidebar"
            data-mobile="true"
            aria-label="Sidebar Navigation"
            className="w-[--sidebar-width-mobile] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
            style={
              {
                // Keep mobile width fixed for now
              } as React.CSSProperties
            }
            side={side}
          >
            <SheetTitle className="sr-only">Sidebar Navigation</SheetTitle>
            <div className="flex h-full w-full flex-col">{children}</div>
          </SheetContent>
        </Sheet>
      )
    }

    // Desktop view (resizable/collapsible)
    const currentWidth = state === 'expanded' ? currentExpandedWidthPx : collapsedWidthVw;
    const offcanvasTranslate = state === 'expanded' ? '0' : `calc((${collapsedWidthVw} - ${currentExpandedWidthPx}))`; // Adjust for offcanvas

    return (
      <div
        ref={ref}
        className="group peer hidden md:block text-sidebar-foreground"
        data-state={state}
        // data-collapsible={collapsible} // We handle width directly now
        data-variant={variant}
        data-side={side}
      >
        {/* This div acts as a spacer */}
        <div
          className={cn(
            "relative h-svh bg-transparent transition-[width] duration-300 ease-in-out",
             // Spacer width matches the actual sidebar width
            state === 'expanded' ? "w-[--sidebar-expanded-width]" : "w-[--sidebar-collapsed-width]",
            // Offcanvas specific spacing adjustment
            collapsible === 'offcanvas' && state === 'collapsed' && "w-0",
             className
          )}
          style={{
              width: currentWidth,
              transition: 'width 0.2s ease-out', // Smooth transition
          }}
        />
        {/* This is the actual fixed sidebar */}
        <div
          className={cn(
            "fixed inset-y-0 z-10 hidden h-svh md:flex transition-[width,transform] duration-300 ease-in-out", // Use transform for offcanvas
            side === "left" ? "left-0" : "right-0",
            // Handle offcanvas collapsing
            collapsible === 'offcanvas' && state === 'collapsed' && (side === 'left' ? "-translate-x-[100%] w-[--sidebar-expanded-width]" : "translate-x-[100%] w-[--sidebar-expanded-width]"), // Slide completely out, but keep track of expanded width for reopening
            collapsible === 'offcanvas' && state === 'collapsed' && "transform", // Ensure transform is applied
            // Border for sidebar variant
            variant === "sidebar" && (side === "left" ? "border-r" : "border-l"),
            // Padding for floating/inset variants
            variant === "floating" || variant === "inset" ? "p-2" : "",
            className
          )}
          style={{ width: currentWidth, transition: 'width 0.2s ease-out' }}
          {...props}
        >
          <div
            data-sidebar="sidebar"
            className={cn(
                "flex h-full w-full flex-col overflow-hidden bg-sidebar", // Added overflow-hidden
                variant === "floating" && "rounded-lg border border-sidebar-border shadow"
            )}
          >
            {children}
          </div>
          {/* Render resize handle only if not offcanvas */}
           {collapsible !== 'offcanvas' && <SidebarRail />}
        </div>
      </div>
    )
  }
)
Sidebar.displayName = "Sidebar"


const SidebarTrigger = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentProps<typeof Button>
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      ref={ref}
      data-sidebar="trigger"
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", className)}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      <PanelLeft />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  )
})
SidebarTrigger.displayName = "SidebarTrigger"


const SidebarRail = React.forwardRef<
  HTMLDivElement, // Changed from button to div for non-interactive handle
  React.ComponentProps<"div">
>(({ className, onMouseDown, ...props }, ref) => {
  const { startResizing, state, isMobile } = useSidebar()

   // Don't render the rail if mobile or if sidebar is collapsed
   if (isMobile || state === 'collapsed') {
    return null;
   }


  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
      // Prevent default drag behavior if necessary
      // event.preventDefault();
      startResizing();
      onMouseDown?.(event); // Call original handler if provided
  };


  return (
    <div
      ref={ref}
      data-sidebar="rail"
      aria-label="Resize Sidebar"
      tabIndex={-1}
      onMouseDown={handleMouseDown} // Use the combined handler
      title="Resize Sidebar"
      className={cn(
        "absolute inset-y-0 z-20 hidden w-2 cursor-ew-resize group-data-[side=left]:right-0 group-data-[side=left]:translate-x-1/2 group-data-[side=right]:left-0 group-data-[side=right]:-translate-x-1/2 md:block", // Adjusted width and positioning
        // Style the rail itself (optional, could be invisible)
        "bg-sidebar-border/50 hover:bg-sidebar-border",
        className
      )}
      {...props}
    />
  )
})
SidebarRail.displayName = "SidebarRail"

// --- Inset, Input, Header, Footer, Separator, Content (mostly unchanged) ---

const SidebarInset = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"main">
>(({ className, ...props }, ref) => {
  // Adjust margin based on sidebar state and width for inset variant
  return (
    <main
      ref={ref}
      className={cn(
        "relative flex min-h-svh flex-1 flex-col bg-background transition-[margin-left,margin-right] duration-300 ease-in-out",
        // Adjust margin based on sidebar state and side for the inset variant
        "peer-data-[variant=inset]:peer-data-[side=left]:peer-data-[state=expanded]:md:ml-[--sidebar-expanded-width]",
        "peer-data-[variant=inset]:peer-data-[side=left]:peer-data-[state=collapsed]:md:ml-[--sidebar-collapsed-width]",
        "peer-data-[variant=inset]:peer-data-[side=right]:peer-data-[state=expanded]:md:mr-[--sidebar-expanded-width]",
        "peer-data-[variant=inset]:peer-data-[side=right]:peer-data-[state=collapsed]:md:mr-[--sidebar-collapsed-width]",
        // Styling for the inset container itself
        "peer-data-[variant=inset]:min-h-[calc(100svh-theme(spacing.4))] md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow",
        className
      )}
      {...props}
    />
  )
})
SidebarInset.displayName = "SidebarInset"


const SidebarInput = React.forwardRef<
  React.ElementRef<typeof Input>,
  React.ComponentProps<typeof Input>
>(({ className, ...props }, ref) => {
  return (
    <Input
      ref={ref}
      data-sidebar="input"
      className={cn(
        "h-8 w-full bg-background shadow-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        "group-data-[state=collapsed]:hidden", // Hide input when collapsed
        className
      )}
      {...props}
    />
  )
})
SidebarInput.displayName = "SidebarInput"

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="header"
      className={cn(
          "flex flex-col gap-2 p-2",
          "group-data-[state=collapsed]:items-center", // Center items when collapsed
           className
        )}
      {...props}
    />
  )
})
SidebarHeader.displayName = "SidebarHeader"

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="footer"
      className={cn(
          "flex flex-col gap-2 p-2 mt-auto", // Ensure footer stays at bottom
          "group-data-[state=collapsed]:items-center",
           className
        )}
      {...props}
    />
  )
})
SidebarFooter.displayName = "SidebarFooter"

const SidebarSeparator = React.forwardRef<
  React.ElementRef<typeof Separator>,
  React.ComponentProps<typeof Separator>
>(({ className, ...props }, ref) => {
  return (
    <Separator
      ref={ref}
      data-sidebar="separator"
      className={cn(
          "mx-2 w-auto bg-sidebar-border",
          "group-data-[state=collapsed]:mx-auto group-data-[state=collapsed]:w-3/4", // Center separator when collapsed
           className
        )}
      {...props}
    />
  )
})
SidebarSeparator.displayName = "SidebarSeparator"


const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="content"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-auto", // Ensure content scrolls
        // "group-data-[state=collapsed]:overflow-hidden", // Hide overflow text when collapsed? Maybe allow scroll?
        className
      )}
      {...props}
    />
  )
})
SidebarContent.displayName = "SidebarContent"

// --- Group components ---

const SidebarGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="group"
      className={cn(
        "relative flex w-full min-w-0 flex-col p-2",
        "group-data-[state=collapsed]:px-0 group-data-[state=collapsed]:items-center", // Adjust padding/alignment for collapsed
         className
    )}
      {...props}
    />
  )
})
SidebarGroup.displayName = "SidebarGroup"

const SidebarGroupLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "div"

  return (
    <Comp
      ref={ref}
      data-sidebar="group-label"
      className={cn(
        "duration-200 flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[opacity] ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        "group-data-[state=collapsed]:pointer-events-none group-data-[state=collapsed]:w-0 group-data-[state=collapsed]:p-0 group-data-[state=collapsed]:opacity-0", // Hide label visually and from interaction when collapsed
        className
      )}
      {...props}
    />
  )
})
SidebarGroupLabel.displayName = "SidebarGroupLabel"

const SidebarGroupAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      ref={ref}
      data-sidebar="group-action"
      className={cn(
        "absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 after:md:hidden",
        "group-data-[state=collapsed]:hidden", // Hide action when collapsed
        className
      )}
      {...props}
    />
  )
})
SidebarGroupAction.displayName = "SidebarGroupAction"

const SidebarGroupContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="group-content"
    className={cn("w-full text-sm", className)}
    {...props}
  />
))
SidebarGroupContent.displayName = "SidebarGroupContent"

// --- Menu components ---

const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu"
    className={cn(
        "flex w-full min-w-0 flex-col gap-1",
        "group-data-[state=collapsed]:items-center",
         className
        )}
    {...props}
  />
))
SidebarMenu.displayName = "SidebarMenu"

const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    data-sidebar="menu-item"
    className={cn(
        "group/menu-item relative w-full", // Ensure item takes full width available
        "group-data-[state=collapsed]:w-auto", // Allow item to shrink in collapsed state
         className
    )}
    {...props}
  />
))
SidebarMenuItem.displayName = "SidebarMenuItem"


// Adjustments for collapsed state (showing only icon)
const sidebarMenuButtonVariants = cva(
    "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:!size-8 group-data-[state=collapsed]:!p-0 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline:
          "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
      },
      size: {
        default: "h-8 text-sm",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm group-data-[state=collapsed]:!size-10", // Adjust collapsed icon size for lg
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)


const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean
    isActive?: boolean
    tooltip?: string | React.ComponentProps<typeof TooltipContent>
  } & VariantProps<typeof sidebarMenuButtonVariants>
>(
  (
    {
      asChild = false,
      isActive = false,
      variant = "default",
      size = "default",
      tooltip,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"
    const { isMobile, state } = useSidebar()

    // Conditionally render children (text) based on sidebar state
    const renderChildren = () => {
        if (state === 'collapsed' && !isMobile) {
            // Keep only the first child (expected to be the icon)
            return React.Children.toArray(children).find((child: any) =>
                React.isValidElement(child) && child.type !== 'span' && typeof child.type !== 'string' // Heuristic for icon
             ) || null;
        }
        return children;
    };


    const button = (
      <Comp
        ref={ref}
        data-sidebar="menu-button"
        data-size={size}
        data-active={isActive}
        className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
        {...props}
      >
        {renderChildren()}
      </Comp>
    )

    // Tooltip logic remains the same, shows when collapsed
    if (!tooltip) {
      return button
    }

    if (typeof tooltip === "string") {
      tooltip = {
        children: tooltip,
      }
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent
          side="right"
          align="center"
          hidden={state !== "collapsed" || isMobile}
          {...tooltip}
        />
      </Tooltip>
    )
  }
)
SidebarMenuButton.displayName = "SidebarMenuButton"

const SidebarMenuAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean
    showOnHover?: boolean
  }
>(({ className, asChild = false, showOnHover = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-action"
      className={cn(
        "absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 after:md:hidden",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[state=collapsed]:hidden", // Hide when collapsed
        showOnHover &&
          "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0",
        className
      )}
      {...props}
    />
  )
})
SidebarMenuAction.displayName = "SidebarMenuAction"

const SidebarMenuBadge = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="menu-badge"
    className={cn(
      "absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums text-sidebar-foreground select-none pointer-events-none",
      "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
      "peer-data-[size=sm]/menu-button:top-1",
      "peer-data-[size=default]/menu-button:top-1.5",
      "peer-data-[size=lg]/menu-button:top-2.5",
      "group-data-[state=collapsed]:hidden", // Hide badge when collapsed
      className
    )}
    {...props}
  />
))
SidebarMenuBadge.displayName = "SidebarMenuBadge"

const SidebarMenuSkeleton = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    showIcon?: boolean
  }
>(({ className, showIcon = true, ...props }, ref) => { // Show icon by default
  const { state } = useSidebar();
  // Random width between 50 to 90%.
  const width = React.useMemo(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`
  }, [])

  return (
    <div
      ref={ref}
      data-sidebar="menu-skeleton"
      className={cn(
        "rounded-md h-8 flex gap-2 px-2 items-center",
        state === 'collapsed' && "w-8 justify-center px-0", // Adjust for collapsed state
        className
        )}
      {...props}
    >
      {showIcon && (
        <Skeleton
          className="size-4 rounded-md"
          data-sidebar="menu-skeleton-icon"
        />
      )}
      {state === 'expanded' && ( // Only show text skeleton if expanded
         <Skeleton
            className="h-4 flex-1 max-w-[--skeleton-width]"
            data-sidebar="menu-skeleton-text"
            style={
            {
                "--skeleton-width": width,
            } as React.CSSProperties
            }
         />
      )}
    </div>
  )
})
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton"

const SidebarMenuSub = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu-sub"
    className={cn(
      "mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5",
      "group-data-[state=collapsed]:hidden", // Hide sub-menu when collapsed
      className
    )}
    {...props}
  />
))
SidebarMenuSub.displayName = "SidebarMenuSub"

const SidebarMenuSubItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ ...props }, ref) => <li ref={ref} {...props} />)
SidebarMenuSubItem.displayName = "SidebarMenuSubItem"

const SidebarMenuSubButton = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<"a"> & {
    asChild?: boolean
    size?: "sm" | "md"
    isActive?: boolean
  }
>(({ asChild = false, size = "md", isActive, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a"

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        "flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        "group-data-[state=collapsed]:hidden", // Hide sub-button when collapsed
        className
      )}
      {...props}
    />
  )
})
SidebarMenuSubButton.displayName = "SidebarMenuSubButton"


export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
}
