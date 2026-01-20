import { AnimatePresence, motion } from "framer-motion";
import { type ReactNode, useRef, useEffect, useCallback } from "react";

interface PopupProps {
  onClose?: () => void;
  isOpen?: boolean;
  children: ReactNode;
  className?: string;
  showButton?: boolean;
  title?: string;
  description?: string;
  centered?: boolean;
  closeOnBackdropClick?: boolean;
}

const Popup: React.FC<PopupProps> = ({
  isOpen = false,
  onClose,
  children,
  showButton = false,
  className = "",
  title,
  description,
  centered = false,
  closeOnBackdropClick = true,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const firstFocusableElement = useRef<HTMLElement | null>(null);
  const lastFocusableElement = useRef<HTMLElement | null>(null);

  // Get all focusable elements inside the popup
  const getFocusableElements = useCallback(() => {
    if (!popupRef.current) return [];
    
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'textarea:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');
    
    return Array.from(popupRef.current.querySelectorAll(focusableSelectors)) as HTMLElement[];
  }, []);

  // Lock body scroll and handle focus trap
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement as HTMLElement;
      
      // Prevent body scrolling
      document.body.style.overflow = 'hidden';
      
      // Focus the popup for accessibility
      setTimeout(() => {
        if (popupRef.current) {
          popupRef.current.focus();
        }
      }, 100);
      
      // Get focusable elements after a brief delay to ensure children are rendered
      setTimeout(() => {
        const focusableElements = getFocusableElements();
        if (focusableElements.length > 0) {
          firstFocusableElement.current = focusableElements[0];
          lastFocusableElement.current = focusableElements[focusableElements.length - 1];
        }
      }, 150);
    } else {
      // Restore body scrolling
      document.body.style.overflow = '';
      
      // Restore focus to the previously focused element
      if (previousActiveElement.current) {
        setTimeout(() => {
          previousActiveElement.current?.focus();
        }, 100);
      }
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, getFocusableElements]);

  // Handle Escape key to close popup
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onClose) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  // Handle tab key for focus trapping
  const handleTabKey = useCallback((event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;
    
    if (!firstFocusableElement.current || !lastFocusableElement.current) {
      return;
    }
    
    // If shift + tab on first element, move to last element
    if (event.shiftKey) {
      if (document.activeElement === firstFocusableElement.current) {
        event.preventDefault();
        lastFocusableElement.current.focus();
      }
    } 
    // If tab on last element, move to first element
    else {
      if (document.activeElement === lastFocusableElement.current) {
        event.preventDefault();
        firstFocusableElement.current.focus();
      }
    }
  }, []);

  // Add focus trap event listener
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleTabKey);
    }
    
    return () => {
      document.removeEventListener('keydown', handleTabKey);
    };
  }, [isOpen, handleTabKey]);

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (closeOnBackdropClick && event.target === event.currentTarget && onClose) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className={`fixed inset-0 z-[100] bg-black/50 ${
            centered 
              ? "flex items-center justify-center" 
              : "flex  justify-end"
          }`}
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? "popup-title" : undefined}
          aria-describedby={description ? "popup-description" : undefined}
        >
          <motion.div
            ref={popupRef}
            tabIndex={-1}
            initial={{ 
              opacity: 0, 
              y: centered ? -20 : 0,
              x: centered ? 0 : 100 
            }}
            animate={{ 
              opacity: 1, 
              y: 0,
              x: 0 
            }}
            exit={{ 
              opacity: 0, 
              y: centered ? 20 : 0,
              x: centered ? 0 : 100 
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={`relative bg-white rounded-2xl w-full max-w-[307px] h-[230px] py-5 ${className} ${
              centered ? "" : "mr-4"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {showButton && (
              <button
                ref={(el) => {
                  // Store as first focusable element
                  if (el) firstFocusableElement.current = el;
                }}
                className="absolute top-2 right-4"
                onClick={onClose}
                aria-label="Close popup"
              >
                <img src="/icons/close.svg" width={24} height={24} alt="Close" />
              </button>
            )}

            {(title || description) && (
              <div className="flex flex-col items-center justify-center mx-auto">
                <img
                  src="/images/icons/check.svg"
                  alt=""
                  className="flex items-center justify-center bg-[#34C759] rounded-full size-10 p-2"
                />
                {title && <h2 id="popup-title" className="text-xl text-text mt-2 font-normal">{title}</h2>}
                {description && <p id="popup-description" className="text-sm text-center text-text-foreground mt-3">{description}</p>}
              </div>
            )}

            <div className="p-6" onClick={(e) => e.stopPropagation()}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Popup;