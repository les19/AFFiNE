import type React from 'react';

export const SmallLogoIcon = (props: React.SVGProps<SVGSVGElement>) => {

    return (
        <svg width="156" height="156" viewBox="0 0 156 156" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clip-path="url(#clip0_1_8)">
                <rect width="156" height="156" rx="48" fill="#2B60E4" />
                <path d="M61 92.5L86.5 118.5L183.5 22" stroke="white" stroke-opacity="0.16" stroke-width="28" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M46 77.5L71.5 103.5L168.5 7" stroke="url(#paint0_linear_1_8)" stroke-width="28" stroke-linecap="round" stroke-linejoin="round" />
            </g>
            <defs>
                <linearGradient id="paint0_linear_1_8" x1="168" y1="7" x2="43" y2="104" gradientUnits="userSpaceOnUse">
                    <stop stop-color="white" />
                    <stop offset="1" stop-color="#B6CBFF" />
                </linearGradient>
                <clipPath id="clip0_1_8">
                    <rect width="156" height="156" rx="48" fill="white" />
                </clipPath>
            </defs>
        </svg>
    );
};
