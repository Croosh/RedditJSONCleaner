import React, { useState, useMemo } from 'react';
import { Copy, Check, Trash2, ArrowDown } from 'lucide-react';
import YAML from 'yaml';
import TOML from '@iarna/toml';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-toml';
import 'prismjs/themes/prism.css';

type FormatOption = 'json' | 'toml' | 'yaml';

type CleanOptions = {
  includeAuthor: boolean;
  includeUpvotes: boolean;
  includeSubreddit: boolean;
  includeReplies: boolean;
  includePostMetadata: boolean;
  includeEngagement: boolean;
  includeTimestamps: boolean;
  includeFlair: boolean;
};

function parseComment(commentData: any, options: CleanOptions): any {
  const comment: any = {
    body: commentData.body || "",
  };

  if (options.includeAuthor) {
    comment.author = commentData.author || "[deleted]";
  }
  if (options.includeUpvotes) {
    comment.upvotes = commentData.score || 0;
  }
  if (options.includePostMetadata) {
    if (commentData.id) comment.id = commentData.id;
    if (commentData.permalink) comment.permalink = commentData.permalink;
  }
  if (options.includeTimestamps) {
    if (commentData.created_utc) comment.created_utc = commentData.created_utc;
  }

  if (options.includeReplies) {
    comment.replies = [];
    const repliesData = commentData.replies || "";
    if (
      typeof repliesData === "object" &&
      repliesData.data &&
      repliesData.data.children
    ) {
      for (const replyChild of repliesData.data.children) {
        if (replyChild.kind === "t1") {
          comment.replies.push(parseComment(replyChild.data, options));
        }
      }
    }
  }

  return comment;
}

function cleanRedditJson(rawData: any, options: CleanOptions): any {
  if (!Array.isArray(rawData) || rawData.length === 0) {
    return { error: "Invalid Reddit JSON format. Expected a list of listings." };
  }

  const cleanedData: any = {
    post: {},
    comments: [],
  };

  // 1. Process the main post
  const postListing = rawData[0];
  if (
    postListing.data &&
    postListing.data.children &&
    postListing.data.children.length > 0
  ) {
    const postInfo = postListing.data.children[0].data;
    cleanedData.post.title = postInfo.title || "";
    cleanedData.post.selftext = postInfo.selftext || "";

    if (options.includeSubreddit) {
      cleanedData.post.subreddit = postInfo.subreddit || "";
    }
    if (options.includeAuthor) {
      cleanedData.post.author = postInfo.author || "[deleted]";
    }
    if (options.includeUpvotes) {
      cleanedData.post.upvotes = postInfo.score || 0;
    }
    if (options.includePostMetadata) {
      if (postInfo.id) cleanedData.post.id = postInfo.id;
      if (postInfo.url) cleanedData.post.url = postInfo.url;
      if (postInfo.permalink) cleanedData.post.permalink = postInfo.permalink;
    }
    if (options.includeEngagement) {
      if (postInfo.upvote_ratio !== undefined) cleanedData.post.upvote_ratio = postInfo.upvote_ratio;
      if (postInfo.num_comments !== undefined) cleanedData.post.num_comments = postInfo.num_comments;
    }
    if (options.includeTimestamps) {
      if (postInfo.created_utc) cleanedData.post.created_utc = postInfo.created_utc;
    }
    if (options.includeFlair) {
      if (postInfo.link_flair_text) cleanedData.post.link_flair_text = postInfo.link_flair_text;
    }
  }

  // 2. Process the comments
  if (rawData.length > 1) {
    const commentsListing = rawData[1];
    if (commentsListing.data && commentsListing.data.children) {
      for (const child of commentsListing.data.children) {
        if (child.kind === "t1") {
          cleanedData.comments.push(parseComment(child.data, options));
        }
      }
    }
  }

  return cleanedData;
}

function Toggle({ label, checked, onChange }: { label: string, checked: boolean, onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-3.5 border-b border-gray-200/60 last:border-0">
      <span className="text-[16px] text-gray-900 tracking-tight">{label}</span>
      <div className="relative inline-flex items-center">
        <input 
          type="checkbox" 
          className="sr-only" 
          checked={checked} 
          onChange={(e) => onChange(e.target.checked)} 
        />
        <div className={`w-[51px] h-[31px] rounded-full transition-colors duration-200 ease-in-out ${checked ? 'bg-[#34C759]' : 'bg-[#E9E9EA]'}`}></div>
        <div className={`absolute left-[2px] top-[2px] bg-white w-[27px] h-[27px] rounded-full shadow-[0_3px_8px_rgba(0,0,0,0.15)] transition-transform duration-200 ease-in-out ${checked ? 'translate-x-[20px]' : 'translate-x-0'}`}></div>
      </div>
    </label>
  );
}

export default function App() {
  const [inputJson, setInputJson] = useState('');
  const [format, setFormat] = useState<FormatOption>('json');
  const [options, setOptions] = useState<CleanOptions>({
    includeAuthor: true,
    includeUpvotes: true,
    includeSubreddit: true,
    includeReplies: true,
    includePostMetadata: false,
    includeEngagement: false,
    includeTimestamps: false,
    includeFlair: false,
  });
  const [copied, setCopied] = useState(false);

  const parsedInput = useMemo(() => {
    if (!inputJson.trim()) return null;
    try {
      return JSON.parse(inputJson);
    } catch (e) {
      return { error: "Invalid JSON format. Please ensure it is valid JSON." };
    }
  }, [inputJson]);

  const outputJson = useMemo(() => {
    if (!parsedInput) return '';
    if (parsedInput.error) return JSON.stringify(parsedInput, null, 2);
    
    const cleaned = cleanRedditJson(parsedInput, options);
    
    try {
      if (format === 'yaml') {
        return YAML.stringify(cleaned);
      }
      if (format === 'toml') {
        return TOML.stringify(cleaned);
      }
      return JSON.stringify(cleaned, null, 2);
    } catch (e) {
      return JSON.stringify({ error: `Failed to format output as ${format.toUpperCase()}` }, null, 2);
    }
  }, [parsedInput, options, format]);

  const stats = useMemo(() => {
    if (!inputJson || !outputJson || parsedInput?.error) return null;
    
    const inputBytes = new Blob([inputJson]).size;
    const outputBytes = new Blob([outputJson]).size;
    const inputTokens = Math.ceil(inputJson.length / 4);
    const outputTokens = Math.ceil(outputJson.length / 4);
    
    const savedBytes = inputBytes - outputBytes;
    const savedTokens = inputTokens - outputTokens;
    const savedPercentage = inputBytes > 0 ? Math.round((savedBytes / inputBytes) * 100) : 0;
    
    return {
      input: { bytes: inputBytes, tokens: inputTokens },
      output: { bytes: outputBytes, tokens: outputTokens },
      saved: { bytes: savedBytes, tokens: savedTokens, percentage: savedPercentage }
    };
  }, [inputJson, outputJson, parsedInput]);

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  const handleCopy = async () => {
    if (!outputJson) return;
    try {
      await navigator.clipboard.writeText(outputJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] text-gray-900 font-sans selection:bg-blue-200">
      <div className="max-w-6xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 mb-2">Reddit JSON Cleaner</h1>
          <p className="text-[15px] text-gray-500 max-w-lg mx-auto">
            Paste raw Reddit API JSON to extract clean, qualitative data optimized for AI analysis.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:h-[calc(100vh-12rem)] lg:min-h-[700px]">
          
          {/* Left Column: Input & Options */}
          <div className="lg:col-span-5 flex flex-col gap-8 h-full min-h-0">
            
            {/* Input Section */}
            <div className="flex flex-col flex-1 min-h-[300px] lg:min-h-0">
              <div className="px-4 pb-2 flex justify-between items-center shrink-0">
                <h2 className="text-[13px] font-medium uppercase tracking-wider text-gray-500 ml-2">Raw JSON Input</h2>
                {inputJson && (
                  <button 
                    onClick={() => setInputJson('')}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50 cursor-pointer"
                    title="Clear input"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div className="bg-white rounded-[20px] shadow-sm border border-gray-200/60 flex-1 flex flex-col overflow-hidden relative">
                <div className="absolute inset-0 overflow-y-auto">
                  <Editor
                    value={inputJson}
                    onValueChange={setInputJson}
                    highlight={code => Prism.highlight(code, Prism.languages.json, 'json')}
                    padding={16}
                    placeholder="Paste raw Reddit JSON here (e.g., from reddit.com/r/.../.json)..."
                    className="min-h-full text-[13px] leading-relaxed font-mono bg-transparent text-gray-700 outline-none"
                    textareaClassName="focus:outline-none"
                    style={{
                      fontFamily: '"Martian Mono", monospace',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Options Section */}
            <div className="flex flex-col shrink-0">
              <div className="px-4 pb-2">
                <h2 className="text-[13px] font-medium uppercase tracking-wider text-gray-500 ml-2">Include Data</h2>
              </div>
              <div className="bg-white rounded-[20px] shadow-sm overflow-hidden border border-gray-200/60">
                <div className="px-5 py-1 max-h-[350px] overflow-y-auto">
                  <Toggle 
                    label="Author Names" 
                    checked={options.includeAuthor} 
                    onChange={(c) => setOptions({...options, includeAuthor: c})} 
                  />
                  <Toggle 
                    label="Upvotes / Scores" 
                    checked={options.includeUpvotes} 
                    onChange={(c) => setOptions({...options, includeUpvotes: c})} 
                  />
                  <Toggle 
                    label="Subreddit Name" 
                    checked={options.includeSubreddit} 
                    onChange={(c) => setOptions({...options, includeSubreddit: c})} 
                  />
                  <Toggle 
                    label="Nested Replies" 
                    checked={options.includeReplies} 
                    onChange={(c) => setOptions({...options, includeReplies: c})} 
                  />
                  <Toggle 
                    label="Post Metadata (ID, URL)" 
                    checked={options.includePostMetadata} 
                    onChange={(c) => setOptions({...options, includePostMetadata: c})} 
                  />
                  <Toggle 
                    label="Engagement (Ratio, Comments)" 
                    checked={options.includeEngagement} 
                    onChange={(c) => setOptions({...options, includeEngagement: c})} 
                  />
                  <Toggle 
                    label="Timestamps" 
                    checked={options.includeTimestamps} 
                    onChange={(c) => setOptions({...options, includeTimestamps: c})} 
                  />
                  <Toggle 
                    label="Post Flair" 
                    checked={options.includeFlair} 
                    onChange={(c) => setOptions({...options, includeFlair: c})} 
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Output */}
          <div className="lg:col-span-7 flex flex-col h-full min-h-[500px] lg:min-h-0">
            <div className="px-4 pb-2 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <h2 className="text-[13px] font-medium uppercase tracking-wider text-gray-500 ml-2">Cleaned Output</h2>
              </div>
              <div className="flex items-center gap-1 bg-gray-200/80 p-1 rounded-lg">
                {(['json', 'toml', 'yaml'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setFormat(fmt)}
                    className={`px-3 py-1 text-[11px] font-semibold tracking-wide rounded-md transition-all cursor-pointer ${
                      format === fmt 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-[20px] shadow-sm overflow-hidden border border-gray-200/60 flex-1 flex flex-col min-h-0">
              
              {stats && (
                <div className="grid grid-cols-3 gap-4 px-6 py-4 bg-white border-b border-gray-100 shrink-0">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Original</span>
                    <span className="text-[16px] font-semibold text-gray-900 tracking-tight">{formatBytes(stats.input.bytes)}</span>
                    <span className="text-[12px] text-gray-500">{stats.input.tokens.toLocaleString()} tokens</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Cleaned</span>
                    <span className="text-[16px] font-semibold text-gray-900 tracking-tight">{formatBytes(stats.output.bytes)}</span>
                    <span className="text-[12px] text-gray-500">{stats.output.tokens.toLocaleString()} tokens</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-[#34C759] uppercase tracking-wider mb-1">Reduction</span>
                    <span className="text-[16px] font-semibold text-[#34C759] tracking-tight">-{stats.saved.percentage}%</span>
                    <span className="text-[12px] text-[#34C759]/80">Saved {formatBytes(stats.saved.bytes)}</span>
                  </div>
                </div>
              )}
              
              <div className="flex-1 bg-[#FAFAFA] relative flex flex-col overflow-hidden">
                {!inputJson ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-6 text-center">
                    <ArrowDown className="mb-4 text-gray-300" size={32} />
                    <p className="text-[15px]">Paste JSON on the left to see the cleaned result here.</p>
                  </div>
                ) : parsedInput?.error ? (
                  <div className="absolute inset-0 flex items-center justify-center text-red-500 p-6 text-center">
                    <p className="text-[15px] font-medium">{parsedInput.error}</p>
                  </div>
                ) : (
                  <div className="absolute inset-0 overflow-y-auto">
                    <Editor
                      value={outputJson}
                      onValueChange={() => {}}
                      highlight={code => {
                        const lang = Prism.languages[format] || Prism.languages.json;
                        return Prism.highlight(code, lang, format);
                      }}
                      padding={16}
                      className="min-h-full text-[13px] leading-relaxed font-mono bg-transparent text-gray-800 outline-none"
                      textareaClassName="focus:outline-none"
                      style={{
                        fontFamily: '"Martian Mono", monospace',
                      }}
                      readOnly={true}
                    />
                  </div>
                )}
              </div>

              <div className="p-4 bg-white border-t border-gray-100 flex justify-end shrink-0">
                <button
                  onClick={handleCopy}
                  disabled={!outputJson || !!parsedInput?.error}
                  className={`flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl text-[15px] font-semibold transition-all ${
                    !outputJson || !!parsedInput?.error
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : copied
                      ? 'bg-[#34C759] text-white shadow-sm cursor-pointer'
                      : 'bg-[#007AFF] text-white hover:bg-[#007AFF]/90 active:scale-95 shadow-sm cursor-pointer'
                  }`}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy Data'}
                </button>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
