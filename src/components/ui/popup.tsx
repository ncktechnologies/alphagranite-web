import { AnimatePresence, motion } from "framer-motion";
import { type ReactNode, useRef } from "react";

interface PopupProps {
  onClose?: () => void;
  isOpen?: boolean;
  children: ReactNode;
  className?: string;
  showButton?: boolean;
  title?: string;
  description?: string;
}

const Popup: React.FC<PopupProps> = ({
  isOpen = false,
  onClose,
  children,
  showButton = false,
  className = "",
  title,
  description,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget && onClose) {
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
          className="fixed right-0 top-0 h-screen w-full flex justify-end z-50  p-4 bg-black/50"
          onClick={handleBackdropClick}
        >
          <motion.div
            ref={ref}
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={`relative bg-white rounded-2xl w-full h-[230px] max-w-[307px] py-5 ${className}`}
            onClick={(e) => e.stopPropagation()} 
          >
            {showButton && (
              <button
                className="absolute top-2 right-4"
                onClick={onClose}
              >
                <img src="/icons/close.svg" width={24} height={24} alt="Close" />
              </button>
            )}

            {(title || description) && (
              <div className="flex flex-col items-center justify-center mx-auto">
                <img
                  src="/images/icons/check.svg"
                  alt=""
                  className=" flex items-center justify-center bg-[#34C759] rounded-full size-10 p-2"
                />
                {title && <h2 className="text-xl text-text mt-2 font-normal">{title}</h2>}
                {description && <p className="text-sm text-center text-text-foreground mt-3">{description}</p>}
              </div>
            )}

            <div className="p-6" onClick={(e) => e.stopPropagation()}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Popup;
