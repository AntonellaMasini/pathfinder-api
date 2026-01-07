import React from "react";

export const StarDoodle = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="0 0 60 60"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M30 5 L33 22 L50 25 L35 30 L38 48 L30 35 L22 48 L25 30 L10 25 L27 22 Z"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

export const ArrowDoodle = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="0 0 80 40"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M5 20 C20 18, 35 22, 50 20 C55 19, 60 18, 65 20"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M55 12 L67 20 L55 28"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

export const QuestionDoodle = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="0 0 40 50"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 15 C12 8, 20 5, 26 8 C32 11, 32 18, 26 22 C23 24, 20 26, 20 32"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      fill="none"
    />
    <circle cx="20" cy="42" r="2.5" fill="currentColor" />
  </svg>
);

export const SquiggleDoodle = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="0 0 100 30"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M5 15 Q15 5, 25 15 T45 15 T65 15 T85 15 T95 15"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

export const PathDoodle = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="0 0 80 80"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M10 70 C10 50, 30 40, 40 35 C50 30, 60 20, 70 10"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeDasharray="5 5"
      fill="none"
    />
    <circle cx="10" cy="70" r="4" fill="currentColor" />
    <circle cx="70" cy="10" r="4" fill="currentColor" />
  </svg>
);

export const SparklesDoodle = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="0 0 50 50"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M25 5 L27 20 L25 22 L23 20 Z" fill="currentColor" />
    <path d="M25 28 L27 30 L25 45 L23 30 Z" fill="currentColor" />
    <path d="M5 25 L20 23 L22 25 L20 27 Z" fill="currentColor" />
    <path d="M28 25 L30 23 L45 25 L30 27 Z" fill="currentColor" />
  </svg>
);

export const HeartDoodle = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="0 0 50 50"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M25 42 C15 32, 5 25, 5 15 C5 8, 12 5, 17 5 C22 5, 25 10, 25 10 C25 10, 28 5, 33 5 C38 5, 45 8, 45 15 C45 25, 35 32, 25 42 Z"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

export const CircleDoodle = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="0 0 60 60"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <ellipse
      cx="30"
      cy="30"
      rx="25"
      ry="23"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      fill="none"
      transform="rotate(-5 30 30)"
    />
  </svg>
);
