export type Conversation={id:number;title:string;subject:string;pinned:boolean;created_at:string;updated_at:string;last_preview?:string};
export type Source={name:string;url:string;page?:number};
export type Message={id:number|string;role:'user'|'assistant';content:string;created_at:string;sources?:Source[];liked?:boolean|null};
export type Attachment={id:number;file_name:string;file_url:string;file_size:number;mime_type:string;uploading?:boolean;progress?:number;preview?:string};
