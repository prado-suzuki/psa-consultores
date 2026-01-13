import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface ChecklistItem {
  id: number;
  text: string;
  helperText?: string;
}

interface OnboardingChecklistProps {
  title: string;
  description: string;
  items: ChecklistItem[];
  imageUrl?: string;
}

export function OnboardingChecklist({
  title,
  description,
  items,
  imageUrl,
}: OnboardingChecklistProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-4xl mx-auto"
    >
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Content Side */}
          <div className="flex-1 p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-2">
              {title}
            </h2>
            <p className="text-muted-foreground text-sm md:text-base mb-6">
              {description}
            </p>

            <div className="space-y-4">
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <div>
                    <p className="text-foreground text-sm md:text-base">
                      {item.text}
                    </p>
                    {item.helperText && (
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {item.helperText}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Image Side */}
          {imageUrl && (
            <div className="hidden md:block w-80 bg-muted/30 relative">
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ 
                  backgroundImage: `url(${imageUrl})`,
                  opacity: 0.9
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-white/50 to-transparent" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
