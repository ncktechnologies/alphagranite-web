// lib/reportLinks.ts
import { ReactNode } from 'react';
import { Link } from 'react-router';

interface LinkConfig {
    href: string;
    text: string;
    external?: boolean;
}

export const getJobNameLink = (jobName: string, jobId?: number): LinkConfig | null => {
    if (!jobId) return null;
    return { href: `/job/details/${jobId}`, text: jobName };
};

export const getJobNumberLink = (jobNumber: string): LinkConfig => {
    // External Moraware link
    const encoded = encodeURIComponent(jobNumber);
    return { href: `https://alphagraniteaustin.moraware.net/sys/search?search=${encoded}`, text: jobNumber, external: true };
};

export const getFabIdLink = (fabId: number): LinkConfig => {
    return { href: `/sales/${fabId}`, text: String(fabId) };
};

export const renderLink = (config: LinkConfig): ReactNode => {
    if (config.external) {
        return (
            <a href={config.href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline">
                {config.text}
            </a>
        );
    }
    return (
        <Link to={config.href} className="text-blue-600 hover:text-blue-800 hover:underline">
            {config.text}
        </Link>
    );
};