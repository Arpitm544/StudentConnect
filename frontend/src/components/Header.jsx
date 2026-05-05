import React from 'react';

const Header = React.memo(({ 
  userProfile, 
}) => {
  return (
    <header className="sticky top-0 z-40 bg-bg-main/70 backdrop-blur-md border-b border-border-subtle px-4 md:px-8 h-16 flex items-center justify-between">
      <div className="flex items-center gap-4 flex-1 max-w-xl">
      </div>
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-full overflow-hidden border border-text-primary/10 shadow-sm cursor-pointer hover:border-accent/50 transition-all">
          <img src={userProfile?.photo_url || `https://ui-avatars.com/api/?name=${userProfile?.name}`} alt="" className="w-full h-full object-cover" />
        </div>
      </div>
    </header>
  );
});

export default Header;
