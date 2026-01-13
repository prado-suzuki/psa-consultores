import { motion } from "framer-motion";
import { Check, Play } from "lucide-react";

interface ChecklistItem {
  id: number;
  text: string;
  helperText?: string;
  helperLink?: { href: string; text: string };
}

interface OnboardingChecklistProps {
  title: string;
  description: string;
  items: ChecklistItem[];
  videoThumbnailUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
}

export function OnboardingChecklist({
  title,
  description,
  items,
  videoThumbnailUrl,
  videoUrl,
  imageUrl,
}: OnboardingChecklistProps) {
  const thumbnailSrc = videoThumbnailUrl || imageUrl;
  const isVideo = !!videoUrl;

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        {item.helperText}{" "}
                        {item.helperLink && (
                          <a
                            href={item.helperLink.href}
                            className="text-primary hover:underline"
                          >
                            {item.helperLink.text}
                          </a>
                        )}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Video/Image Side */}
          {thumbnailSrc && (
            <div
              className={`hidden md:block w-80 bg-muted/30 relative overflow-hidden ${
                isVideo ? "group cursor-pointer" : ""
              }`}
              onClick={() => isVideo && videoUrl && window.open(videoUrl, "_blank")}
            >
              {/* Thumbnail/Image */}
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${thumbnailSrc})` }}
              />

              {/* Dark Overlay (only for video) */}
              {isVideo && (
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
              )}

              {/* Play Button (only for video) */}
              {isVideo && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-8 h-8 text-primary ml-1" fill="currentColor" />
                  </div>
                </div>
              )}

              {/* Gradient */}
              <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-white/50" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
