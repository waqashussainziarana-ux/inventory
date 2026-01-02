
import React, { useState } from 'react';
import { Product, Invoice } from '../types';
import { SparklesIcon } from './icons';

interface AIInsightsProps {
    products: Product[];
    invoices: Invoice[];
}

const SimpleMarkdown: React.FC<{ text: string }> = ({ text }) => {
    const lines = text.split('\n').map((line, index) => {
        line = line.trim();
        if (line.startsWith('### ')) {
            return <h3 key={index} className="text-lg font-semibold text-slate-800 mt-4 mb-2">{line.substring(4)}</h3>;
        }
        if (line.startsWith('## ')) {
            return <h2 key={index} className="text-xl font-bold text-slate-900 mt-6 mb-3">{line.substring(3)}</h2>;
        }
        if (line.startsWith('# ')) {
            return <h1 key={index} className="text-2xl font-extrabold text-slate-900 mt-8 mb-4">{line.substring(2)}</h1>;
        }
        if (line.startsWith('* ') || line.startsWith('- ')) {
            return <li key={index} className="ml-5 list-disc">{line.substring(2)}</li>;
        }
        if (line === '') {
            return null;
        }
        const parts = line.split('**');
        const renderedParts = parts.map((part, i) =>
            i % 2 === 1 ? <strong key={i} className="font-semibold text-slate-700">{part}</strong> : <span key={i}>{part}</span>
        );
        return <p key={index} className="text-slate-600 mb-2 leading-relaxed">{renderedParts}</p>;
    });

    return <div className="prose prose-sm max-w-none">{lines}</div>;
};


const AIInsights: React.FC<AIInsightsProps> = ({ products, invoices }) => {
    const [insights, setInsights] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateInsights = async () => {
        setIsLoading(true);
        setError(null);
        setInsights(null);

        const savedUser = localStorage.getItem('inventory-user');
        const currentUser = savedUser ? JSON.parse(savedUser) : null;

        if (!currentUser) {
            setError("User session expired. Please log in again.");
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/generate-insights', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': currentUser.id
                },
                body: JSON.stringify({ products, invoices }),
            });

            const text = await response.text();
            const data = text ? JSON.parse(text) : {};

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch insights.');
            }

            setInsights(data.insights);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <SparklesIcon className="w-7 h-7 text-primary" />
                    <h2 className="text-xl font-bold text-slate-800">AI-Powered Insights</h2>
                </div>
                <button
                    onClick={generateInsights}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg shadow-sm hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                >
                    {isLoading ? 'Generating...' : (insights ? 'Regenerate' : 'Generate Insights')}
                </button>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200">
                {isLoading && <p className="text-slate-600 text-center animate-pulse">Generating your business summary...</p>}
                {error && <p className="text-red-600 text-center p-4 bg-red-50 rounded-lg">{error}</p>}
                {insights && (
                    <div className="space-y-4">
                        <SimpleMarkdown text={insights} />
                    </div>
                )}
                {!isLoading && !insights && !error && (
                     <p className="text-slate-500 text-center py-4">Click "Generate Insights" to get an AI-powered summary of your business performance.</p>
                )}
            </div>
        </div>
    );
};

export default AIInsights;
