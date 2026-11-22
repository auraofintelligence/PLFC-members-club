import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = path.join(root, 'public/assets');
const review = path.join(root, '.local/finnius-review');
const ffmpeg = process.env.FFMPEG_PATH || 'C:/FFmpeg/bin/ffmpeg.exe';
const ffprobe = process.env.FFPROBE_PATH || 'C:/FFmpeg/bin/ffprobe.exe';
const source = process.env.FINNIUS_SOURCE || 'C:/Users/Aura2020/Documents/Fishing Club/Finnius the Fishing Mate/Videos/Finnius Welcome Juniors.mp4';
const W = 480;
const H = 854;
const FPS = 24;
const SECONDS = 3;
const FRAME_BYTES = W * H * 4;
const variants = [{ name: 'welcome', start: 13 }, { name: 'wave', start: 29.5 }];

function run(binary, args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    const stdout = [];
    const stderr = [];
    child.stdout.on('data', (chunk) => stdout.push(chunk));
    child.stderr.on('data', (chunk) => stderr.push(chunk));
    child.once('error', reject);
    child.once('close', (code) => code === 0 ? resolve(Buffer.concat(stdout)) : reject(new Error(`${path.basename(binary)} exited ${code}: ${Buffer.concat(stderr)}`)));
    child.stdin.on('error', (error) => { if (error.code !== 'EPIPE') reject(error); });
    child.stdin.end(input);
  });
}

function median(values) {
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)];
}

/**
 * Extract only the connected neutral backdrop. Interior whites, including
 * badges and teeth, remain untouched. The source character is never redrawn.
 * Estimate the light background by row because the original has a grey-to-white
 * gradient. RGB values inside the character remain original source pixels.
 */
function removeConnectedBackdrop(frame) {
  const distance = new Uint8Array(W * H);
  const background = new Uint8Array(H * 3);
  for (let y = 0; y < H; y += 1) {
    const channels = [[], [], []];
    for (const x of [0, 1, 2, 3, W - 4, W - 3, W - 2, W - 1]) {
      const at = (y * W + x) * 4;
      const values = [frame[at], frame[at + 1], frame[at + 2]];
      if (Math.min(...values) >= 180 && Math.max(...values) - Math.min(...values) <= 24) values.forEach((value, channel) => channels[channel].push(value));
    }
    for (let channel = 0; channel < 3; channel += 1) background[y * 3 + channel] = channels[channel].length ? median(channels[channel]) : y ? background[(y - 1) * 3 + channel] : 247;
    for (let x = 0; x < W; x += 1) {
      const at = (y * W + x) * 4;
      distance[y * W + x] = Math.max(...[0, 1, 2].map((channel) => Math.abs(frame[at + channel] - background[y * 3 + channel])));
    }
  }

  const marked = new Uint8Array(W * H);
  const queue = new Int32Array(W * H);
  let read = 0;
  let write = 0;
  const add = (index) => {
    if (!marked[index] && distance[index] <= 35) { marked[index] = 1; queue[write++] = index; }
  };
  for (let x = 0; x < W; x += 1) { add(x); add((H - 1) * W + x); }
  for (let y = 0; y < H; y += 1) { add(y * W); add(y * W + W - 1); }
  // The source's blue floor ring can enclose an empty white patch. Seed neutral
  // floor pixels below the vest, while preserving the coloured ring and tail.
  for (let y = Math.floor(H * 0.72); y < H; y += 1) for (let x = 0; x < W; x += 1) if (distance[y * W + x] <= 12) add(y * W + x);
  while (read < write) {
    const index = queue[read++];
    const x = index % W;
    if (x) add(index - 1);
    if (x < W - 1) add(index + 1);
    if (index >= W) add(index - W);
    if (index < W * (H - 1)) add(index + W);
  }

  const box = { left: W, top: H, right: -1, bottom: -1 };
  for (let index = 0; index < W * H; index += 1) {
    const at = index * 4;
    if (marked[index]) {
      const alpha = Math.round(Math.max(0, Math.min(1, (distance[index] - 12) / 23)) * 255);
      frame[at + 3] = alpha;
      if (!alpha) {
        frame[at] = 0; frame[at + 1] = 0; frame[at + 2] = 0;
      } else if (alpha < 255) {
        const fraction = alpha / 255;
        const y = Math.floor(index / W);
        for (let channel = 0; channel < 3; channel += 1) frame[at + channel] = Math.max(0, Math.min(255, Math.round((frame[at + channel] - (1 - fraction) * background[y * 3 + channel]) / fraction)));
      }
    }
    if (frame[at + 3] >= 24) {
      const x = index % W;
      const y = Math.floor(index / W);
      box.left = Math.min(box.left, x); box.right = Math.max(box.right, x);
      box.top = Math.min(box.top, y); box.bottom = Math.max(box.bottom, y);
    }
  }
  return box;
}

function alphaCheck(frame, width, height) {
  let transparent = 0;
  let visible = 0;
  let visibleEdges = 0;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const alpha = frame[(y * width + x) * 4 + 3];
    if (!alpha) transparent += 1;
    if (alpha >= 24) { visible += 1; if (!x || !y || x === width - 1 || y === height - 1) visibleEdges += 1; }
  }
  if (!transparent || !visible || visibleEdges) throw new Error('Transparency/padding validation failed.');
  return { transparent, visible, visibleEdges };
}

const results = [];
await mkdir(review, { recursive: true });
const cycleOnly = process.argv.includes('--cycle-only');
for (const variant of cycleOnly ? [] : variants) {
  console.error(`Extracting original ${variant.name} gesture, ${variant.start}-${variant.start + SECONDS} seconds.`);
  const raw = await run(ffmpeg, ['-v', 'error', '-ss', String(variant.start), '-t', String(SECONDS), '-i', source, '-vf', `fps=${FPS},scale=${W}:${H}:flags=lanczos,format=rgba`, '-an', '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1']);
  const count = raw.length / FRAME_BYTES;
  if (count !== FPS * SECONDS) throw new Error('Unexpected source frame count.');
  const union = { left: W, top: H, right: -1, bottom: -1 };
  for (let frame = 0; frame < count; frame += 1) {
    const box = removeConnectedBackdrop(raw.subarray(frame * FRAME_BYTES, (frame + 1) * FRAME_BYTES));
    union.left = Math.min(union.left, box.left); union.right = Math.max(union.right, box.right);
    union.top = Math.min(union.top, box.top); union.bottom = Math.max(union.bottom, box.bottom);
  }
  const cropWidth = union.right - union.left + 1;
  const cropHeight = union.bottom - union.top + 1;
  const presentation = `crop=${cropWidth}:${cropHeight}:${union.left}:${union.top},scale=448:768:force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos,pad=480:800:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=rgba`;
  const input = ['-v', 'error', '-y', '-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', `${W}x${H}`, '-framerate', String(FPS), '-i', 'pipe:0'];
  const webm = path.join(assets, `finnius-${variant.name}.webm`);
  const gif = path.join(assets, `finnius-${variant.name}.gif`);
  const poster = path.join(assets, variant.name === 'welcome' ? 'finnius-poster.png' : 'finnius-wave-poster.png');
  await run(ffmpeg, [...input, '-vf', `${presentation},format=yuva420p`, '-an', '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '28', '-deadline', 'good', '-cpu-used', '3', '-row-mt', '1', '-auto-alt-ref', '0', webm], raw);
  const gifFilter = `${presentation},scale=300:500:flags=lanczos,fps=8,split[video][paletteinput];[paletteinput]palettegen=max_colors=256:reserve_transparent=1:stats_mode=full[palette];[video][palette]paletteuse=dither=sierra2_4a:diff_mode=rectangle:alpha_threshold=128[gif]`;
  await run(ffmpeg, [...input, '-filter_complex', gifFilter, '-map', '[gif]', '-an', '-loop', '0', '-gifflags', '+transdiff', gif], raw);
  await run(ffmpeg, [...input, '-vf', presentation, '-frames:v', '1', poster], raw.subarray(0, FRAME_BYTES));

  const probe = JSON.parse((await run(ffprobe, ['-v', 'error', '-count_frames', '-show_entries', 'stream=width,height,nb_read_frames:stream_tags=alpha_mode:format=duration,size', '-of', 'json', webm])).toString());
  if (probe.streams[0].tags?.alpha_mode !== '1' || Number(probe.streams[0].nb_read_frames) !== count || Math.abs(Number(probe.format.duration) - SECONDS) > 0.05) throw new Error('WebM alpha/frame/duration metadata failed.');
  const decoded = await run(ffmpeg, ['-v', 'error', '-c:v', 'libvpx-vp9', '-i', webm, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1']);
  const alpha = alphaCheck(decoded, 480, 800);
  const gifProbe = JSON.parse((await run(ffprobe, ['-v', 'error', '-count_frames', '-show_entries', 'stream=width,height,nb_read_frames:format=duration,size', '-of', 'json', gif])).toString());
  if (Number(gifProbe.streams[0].nb_read_frames) !== SECONDS * 8 || Math.abs(Number(gifProbe.format.duration) - SECONDS) > 0.1) throw new Error('GIF frame count/duration validation failed.');
  const gifBytes = await readFile(gif);
  const loopMarker = gifBytes.indexOf(Buffer.from('NETSCAPE2.0'));
  if (loopMarker < 0 || gifBytes.readUInt16LE(loopMarker + 13) !== 0) throw new Error('GIF must loop indefinitely.');
  const gifFirst = await run(ffmpeg, ['-v', 'error', '-i', gif, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1']);
  const gifAlpha = alphaCheck(gifFirst, 300, 500);
  const firstHash = createHash('sha256').update(raw.subarray(0, FRAME_BYTES)).digest('hex');
  const middleHash = createHash('sha256').update(raw.subarray(Math.floor(count / 2) * FRAME_BYTES, (Math.floor(count / 2) + 1) * FRAME_BYTES)).digest('hex');
  if (firstHash === middleHash) throw new Error('Expected real source motion.');
  results.push({ name: variant.name, originalSeconds: [variant.start, variant.start + SECONDS], sourceFrames: count, sourceCropAt480px: union, webm: { path: webm, bytes: (await stat(webm)).size, width: 480, height: 800, frames: count, seconds: SECONDS, alpha }, gif: { path: gif, bytes: (await stat(gif)).size, width: 300, height: 500, frames: Number(gifProbe.streams[0].nb_read_frames), seconds: Number(gifProbe.format.duration), alpha: gifAlpha }, poster: { path: poster, bytes: (await stat(poster)).size } });
}
if (!cycleOnly) await writeFile(path.join(review, 'original-clip-validation.json'), JSON.stringify(results, null, 2));

// Join the two original encoded clips without another generation of compression.
const clipFiles = variants.map(variant => path.join(assets, 'finnius-' + variant.name + '.webm'));
const manifest = path.join(review, 'cycle.ffconcat');
const relativeClip = file => path.relative(review,file).replaceAll('\\','/').replaceAll("'","'\\''");
await writeFile(manifest, "ffconcat version 1.0\n" + clipFiles.map(file => "file '" + relativeClip(file) + "'").join('\n') + '\n');
const cycle = path.join(assets,'finnius-cycle.webm');
const sheet = path.join(assets,'finnius-cycle-frames.webp');
// The WebM timebase is milliseconds. Preserve the alternating 41/42 ms
// cadence and the full final frame duration when remuxing 24 fps material.
await run(ffmpeg,['-v','error','-y','-f','concat','-safe','0','-i',manifest,'-map','0:v:0','-c:v','copy',
  '-bsf:v','setts=duration=round((N+1)*1000/24)-round(N*1000/24)','-an',cycle]);
const alphaInput = file => ['-c:v','libvpx-vp9','-i',file];
const sampled = 'select=not(mod(n\\,3)),setpts=N/(8*TB),scale=300:500:flags=lanczos,format=rgba';
await run(ffmpeg,['-v','error','-y',...alphaInput(cycle),'-vf',sampled+',tile=8x6:nb_frames=48:color=0x00000000',
  '-frames:v','1','-c:v','libwebp','-quality','87','-compression_level','5','-pix_fmt','yuva420p',sheet]);

// RGBA hashes also check the VP9 auxiliary alpha stream (not just the colour packets).
async function frameHashes(file) {
  const raw = await run(ffmpeg,['-v','error',...alphaInput(file),'-map','0:v:0','-pix_fmt','rgba','-f','framemd5','pipe:1']);
  return raw.toString().split(/\r?\n/).filter(line=>/^\s*\d+,/.test(line)).map(line=>line.split(',').at(-1).trim());
}
const [cycleHashes,welcomeHashes,waveHashes] = await Promise.all([cycle,...clipFiles].map(frameHashes));
const originalHashes = welcomeHashes.concat(waveHashes);
if (cycleHashes.length !== 144 || welcomeHashes.length !== 72 || waveHashes.length !== 72 || cycleHashes.some((h,i)=>h!==originalHashes[i]))
  throw Error('The cycle must preserve every RGBA frame from welcome, then wave.');
const metadata = async file => JSON.parse((await run(ffprobe,['-v','error','-count_frames','-show_entries','stream=width,height,r_frame_rate,nb_read_frames:stream_tags=alpha_mode:format=duration,size','-of','json',file])).toString());
const [movieInfo,sheetInfo] = await Promise.all([cycle,sheet].map(metadata));
const movie = movieInfo.streams[0], atlas = sheetInfo.streams[0];
if (movie.width!==480 || movie.height!==800 || movie.r_frame_rate!=='24/1' || (movie.tags?.alpha_mode || movie.tags?.ALPHA_MODE)!=='1' || Number(movieInfo.format.duration)!==6 ||
    atlas.width!==2400 || atlas.height!==3000 || Number(atlas.nb_read_frames)!==1)
  throw Error('Incorrect Finnius cycle or single-frame sprite sheet format.');

// Compare every cell to the corresponding sample from its original clip.
const tileWidth=300, tileHeight=500, tileBytes=tileWidth*tileHeight*4;
const [decoded,...originals] = await Promise.all([
  run(ffmpeg,['-v','error','-i',sheet,'-frames:v','1','-f','rawvideo','-pix_fmt','rgba','pipe:1']),
  ...clipFiles.map(file=>run(ffmpeg,['-v','error',...alphaInput(file),'-vf',sampled,'-fps_mode','passthrough','-f','rawvideo','-pix_fmt','rgba','pipe:1'])),
]);
if (originals.some(frames=>frames.length!==24*tileBytes) || decoded.length!==2400*3000*4) throw Error('Unexpected sample count.');
let largestColourError=0, largestAlphaError=0;
for (let i=0;i<48;i++) {
  const tile=Buffer.allocUnsafe(tileBytes), left=(i%8)*tileWidth, top=Math.floor(i/8)*tileHeight;
  for (let y=0;y<tileHeight;y++) {
    const from=((top+y)*2400+left)*4;
    decoded.copy(tile,y*tileWidth*4,from,from+tileWidth*4);
  }
  alphaCheck(tile,tileWidth,tileHeight);
  const reference=originals[Math.floor(i/24)].subarray((i%24)*tileBytes,((i%24)+1)*tileBytes);
  let colourError=0, alphaError=0, opaque=0;
  for(let j=0;j<tileBytes;j+=4) {
    alphaError+=Math.abs(tile[j+3]-reference[j+3]);
    if(reference[j+3]<224)continue;
    opaque++;
    for(let c=0;c<3;c++)colourError+=Math.abs(tile[j+c]-reference[j+c]);
  }
  largestColourError=Math.max(largestColourError,colourError/(3*opaque));
  largestAlphaError=Math.max(largestAlphaError,alphaError/(tileWidth*tileHeight));
}
if(largestColourError>8 || largestAlphaError>2)throw Error('The fallback cells do not reproduce the original gesture order or transparency.');
const cycleReport={movie:movieInfo,sheet:sheetInfo,originalFramesVerified:144,verifiedCells:48,largestColourError,largestAlphaError};
await writeFile(path.join(review,'cycle-validation.json'),JSON.stringify(cycleReport,null,2));
console.log(JSON.stringify(cycleReport,null,2));
