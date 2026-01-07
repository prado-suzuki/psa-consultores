interface SectionTransitionProps {
  from: 'light' | 'dark';
  to: 'light' | 'dark';
}

export const SectionTransition = ({ from, to }: SectionTransitionProps) => {
  const getGradient = () => {
    if (from === 'light' && to === 'dark') {
      return 'from-gray-50 to-gray-800';
    }
    if (from === 'dark' && to === 'light') {
      return 'from-gray-800 to-gray-50';
    }
    return '';
  };

  return <div className={`h-16 md:h-24 bg-gradient-to-b ${getGradient()}`} />;
};
