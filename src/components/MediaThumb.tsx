import { useEffect, useRef, useState } from "react";
import type { Helia } from "helia";
import { unixfs } from "@helia/unixfs";

interface Props {
  helia: Helia;
  cid: string;
  name: string;
}

export default function MediaThumb({ helia, cid, name }: Props) {
  const [url, setUrl] = useState<string>("");
  const urlRef = useRef<string>("");

  useEffect(() => {
    const fs = unixfs(helia);
    const ac = new AbortController();
    let revoked = false;

    (async () => {
      try {
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            try {
              for await (const chunk of fs.cat(cid as any, { signal: ac.signal })) {
                controller.enqueue(chunk);
              }
              controller.close();
            } catch (err: any) {
              if (err?.name === "AbortError") return; // normal on unmount
              throw err;
            }
          },
        });

        const resp = new Response(stream);
        const blob = await resp.blob();
        if (!revoked) {
          const objectUrl = URL.createObjectURL(blob);
          urlRef.current = objectUrl;
          setUrl(objectUrl);
        }
      } catch (e) {
        // Most common here is "not a file" if wrong CID; guarded by FilePicker fix
        console.warn("Preview failed for CID", cid, e);
      }
    })();

    return () => {
      ac.abort();
      revoked = true;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = "";
      }
    };
  }, [helia, cid]);

  if (!url)
    return (
      <div className="img-container">
        <div className="w-full h-24 sm:h-32 bg-gray-100 animate-pulse flex items-center justify-center">
          <div className="w-1 h-1 bg-gray-400 rounded-full mx-0.5 animate-bounce"></div>
          <div className="w-1 h-1 bg-gray-400 rounded-full mx-0.5 animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-1 h-1 bg-gray-400 rounded-full mx-0.5 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    );

  if (/\.(mp4|webm|mov)$/i.test(name))
    return (
      <div className="img-container">
        <video src={url} controls className="w-full h-24 sm:h-32 object-cover" />
      </div>
    );
  if (/\.(mp3|wav|ogg)$/i.test(name))
    return (
      <div className="img-container flex items-center justify-center h-24 sm:h-32 bg-gray-50">
        <audio src={url} controls className="w-full max-w-[200px]" />
      </div>
    );
  return (
    <div className="img-container">
      <img 
        src={url} 
        alt={name} 
        className="w-full h-24 sm:h-32 object-cover hover:object-contain transition-all cursor-pointer" 
      />
    </div>
  );
}
