import { Play } from "lucide-react";
import { motion } from "framer-motion";

interface WelcomeVideoCardProps {
  videoThumbnail: string;
  videoTitle: string;
  videoDescription: string;
  videoUrl?: string;
  onPlayVideo?: () => void;
}

export const WelcomeVideoCard = ({
  videoThumbnail,
  videoTitle,
  videoDescription,
  videoUrl,
  onPlayVideo,
}: WelcomeVideoCardProps) => {
  const handleClick = () => {
    if (onPlayVideo) {
      onPlayVideo();
    } else if (videoUrl) {
      window.open(videoUrl, "_blank");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="relative w-full overflow-hidden rounded-2xl cursor-pointer group"
      onClick={handleClick}
    >
      {/* Background Image */}
      <div className="relative aspect-video w-full">
        <img
          src={videoThumbnail}
          alt={videoTitle}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        
        {/* Play Button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110">
            <Play className="w-6 h-6 md:w-8 md:h-8 text-primary fill-primary ml-1" />
          </div>
        </div>
        
        {/* Text Content */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-semibold text-white mb-1">
            {videoTitle}
          </h3>
          <p className="text-sm md:text-base text-white/80">
            {videoDescription}
          </p>
        </div>
      </div>
    </motion.div>
  );
};
