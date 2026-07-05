import React, { useEffect, useState } from 'react';

const SplashScreen = ({ onFinish }) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timer1 = setTimeout(() => setStage(1), 100);
    const timer2 = setTimeout(() => setStage(2), 300);
    const timer3 = setTimeout(() => setStage(3), 500);
    const timer4 = setTimeout(() => setStage(4), 700);
    const timer5 = setTimeout(() => {
      if (onFinish) onFinish();
    }, 3500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  }, [onFinish]);

  const iconSize = 130;
  const glowSize = iconSize * 2.2;
  const shadowOffset = iconSize * 0.06;
  const titleSize = iconSize * 0.25;
  const subtitleSize = titleSize * 0.5;

  const generateStars = () => {
    const stars = [];
    const count = 20 + Math.floor(Math.random() * 10);
    for (let i = 0; i < count; i++) {
      const top = 5 + Math.random() * 90;
      const left = 5 + Math.random() * 90;
      const size = 1.5 + Math.random() * 3;
      const opacityStar = 0.08 + Math.random() * 0.12;
      stars.push(
        <div
          key={i}
          style={{
            position: 'absolute',
            top: `${top}%`,
            left: `${left}%`,
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            backgroundColor: '#caae61',
            opacity: opacityStar,
            pointerEvents: 'none',
          }}
        />
      );
    }
    return stars;
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: '"Tajawal", sans-serif',
        background: 'linear-gradient(180deg, #1A6E5A 0%, #1A4A3A 100%)',
        zIndex: 9999,
        overflow: 'hidden',
      }}
    >
      {/* ✅ الطبقة الشفافة الأولى (Overlay 1) - كما في الأصل */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(180deg, rgba(201, 168, 76, 0.25) 0%, rgba(201, 168, 76, 0.10) 50%, rgba(201, 168, 76, 0) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* ✅ الطبقة الشفافة الثانية (Overlay 2) - كما في الأصل */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(180deg, rgba(201, 168, 76, 0.35) 0%, rgba(201, 168, 76, 0.15) 50%, rgba(201, 168, 76, 0) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* النجوم */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
        }}
      >
        {generateStars()}
      </div>

      {/* حاوية التوهج والأيقونة */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: glowSize,
          height: glowSize,
          marginBottom: '-50px',
        }}
      >
        {[
          { size: glowSize, opacity: 0.04, delay: 0 },
          { size: glowSize * 0.7, opacity: 0.08, delay: 0.2 },
          { size: glowSize * 0.45, opacity: 0.15, delay: 0.4 },
        ].map((layer, idx) => (
          <div
            key={idx}
            style={{
              position: 'absolute',
              width: layer.size,
              height: layer.size,
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(202, 174, 97, ${layer.opacity}) 0%, transparent 70%)`,
              opacity: stage >= 1 ? 1 : 0,
              transition: `opacity 0.8s ease ${layer.delay}s`,
              pointerEvents: 'none',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}

        <div
          style={{
            position: 'relative',
            width: iconSize,
            height: iconSize,
            transform: stage >= 2 ? 'scale(1)' : 'scale(0.8)',
            transition: 'transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <img
            src="/assets/shadow.png"
            alt=""
            style={{
              position: 'absolute',
              top: shadowOffset * 0.8,
              left: 0,
              width: iconSize,
              height: iconSize,
              opacity: stage >= 3 ? 0.8 : 0,
              transition: 'opacity 0.6s ease',
              pointerEvents: 'none',
            }}
          />
          <img
            src="/assets/quranicon.png"
            alt="شعار مراجِع"
            style={{
              width: iconSize,
              height: iconSize,
              opacity: stage >= 2 ? 1 : 0,
              transition: 'opacity 0.7s ease',
              position: 'relative',
              zIndex: 1,
              backfaceVisibility: 'hidden',
            }}
          />
        </div>
      </div>

      <h1
        style={{
          fontFamily: '"Tajawal", sans-serif',
          fontWeight: 700,
          fontSize: titleSize,
          color: '#caae61',
          textAlign: 'center',
          textShadow: '0 4px 20px rgba(0,0,0,0.42)',
          marginBottom: '4px',
          padding: '9px 20px', // ← تم تصحيح padding
          opacity: stage >= 4 ? 1 : 0,
          transform: stage >= 4 ? 'translateY(0)' : 'translateY(30px)',
          transition: 'opacity 0.7s ease, transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
          lineHeight: '1.6',
          letterSpacing: '2px',
        }}
      >
        مُراجِع
      </h1>

      <p
        style={{
          fontFamily: '"Tajawal", sans-serif',
          fontWeight: 400,
          fontSize: subtitleSize,
          color: '#F5F0E1',
          textAlign: 'center',
          opacity: stage >= 4 ? 0.9 : 0,
          transform: stage >= 4 ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.7s ease, transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
          padding: '2.4px 20px', // ← تم تصحيح padding
          textShadow: '0 2px 10px rgba(0,0,0,0.3)',
          letterSpacing: '0.5px',
        }}
      >
        إدارة مراجعة القرآن
      </p>
    </div>
  );
};

export default SplashScreen;