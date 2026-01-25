<template>
  <div class="w-full h-full relative flex flex-col" ref="containerRef">
    <!-- Chart Container -->
    <div class="relative flex-1 w-full min-h-[200px]" @mouseleave="activePoint = null">
      
      <!-- Loading / Empty State -->
      <div v-if="!data.length" class="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
        Belum ada data grafik
      </div>

      <svg 
        v-else
        class="w-full h-full overflow-visible"
        style="overflow: visible;"
      >
        <defs>
          <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#10B981" stop-opacity="0.2" />
            <stop offset="100%" stop-color="#10B981" stop-opacity="0" />
          </linearGradient>
          <!-- Shadow filter for line -->
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#10B981" flood-opacity="0.3"/>
          </filter>
        </defs>

        <!-- Grid Lines (Y-axis) -->
        <g class="text-slate-100">
          <line 
            v-for="tick in yTicks" 
            :key="tick"
            :x1="0" 
            :y1="scaleY(tick)" 
            :x2="width" 
            :y2="scaleY(tick)" 
            stroke="currentColor" 
            stroke-dasharray="4 4"
            vector-effect="non-scaling-stroke"
          />
        </g>

        <!-- Vertical Cursor Line -->
        <line 
          v-if="activePoint"
          :x1="activePoint.x"
          :y1="0"
          :x2="activePoint.x"
          :y2="height"
          stroke="#10B981"
          stroke-width="1"
          stroke-dasharray="4 4"
          class="opacity-50 transition-all duration-75"
        />

        <!-- Chart Path (Fill) -->
        <path 
          :d="fillPath" 
          fill="url(#gradient)" 
          class="transition-all duration-300 ease-out"
        />

        <!-- Chart Path (Line) -->
        <path 
          :d="linePath" 
          fill="none" 
          stroke="#10B981" 
          stroke-width="3" 
          stroke-linecap="round"
          stroke-linejoin="round"
          vector-effect="non-scaling-stroke"
          style="filter: url(#shadow);"
          class="transition-all duration-300 ease-out"
        />

        <!-- Data Points & Hover Targets -->
        <g v-for="(point, index) in points" :key="index">
          <!-- Active State: Outer Glow Circle -->
          <circle 
            v-if="isActive(index)"
            :cx="point.x" 
            :cy="point.y" 
            r="12" 
            class="fill-emerald-500/20 animate-pulse"
          />

          <!-- Visual Point -->
          <circle 
            :cx="point.x" 
            :cy="point.y" 
            :r="isActive(index) ? 6 : 4" 
            class="fill-white stroke-emerald-500 stroke-[3] transition-all duration-200"
            :class="isActive(index) ? 'opacity-100' : 'opacity-0'"
          />

          <!-- Hover Hit Area (Invisible Bar covering full column) -->
          <rect
            :x="point.x - (width / points.length / 2)"
            y="0"
            :width="width / points.length"
            :height="height"
            fill="transparent"
            @mouseenter="activePoint = point"
            class="cursor-pointer"
          />
        </g>
      </svg>

      <!-- Custom Tooltip -->
      <div 
        v-if="activePoint && activePoint.raw"
        class="absolute pointer-events-none bg-slate-800 text-white px-3 py-2 rounded-lg shadow-xl flex flex-col items-center gap-0.5 z-20 transition-all duration-75 min-w-[80px]"
        :style="{ 
          left: `${activePoint.x}px`, 
          top: `0px`, 
          transform: 'translate(-50%, -120%)' 
        }"
      >
        <span class="text-[10px] font-semibold text-slate-300 tracking-wide uppercase">
          {{ formatDate(activePoint.raw.date) }}
        </span>
        <span class="text-sm font-bold">
          {{ activePoint.raw.count }} PO
        </span>
        
        <!-- Arrow -->
        <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
      </div>

    </div>

    <!-- X-Axis Labels -->
    <div class="flex justify-between mt-2 px-2 border-t border-slate-50 pt-2">
      <span 
        v-for="(item, index) in data" 
        :key="index"
        class="text-[10px] font-medium text-center w-8 transition-colors duration-200"
        :class="isActive(index) ? 'text-emerald-600 font-bold' : 'text-slate-400'"
      >
        {{ formatDay(item.date) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  data: { date: string; count: number }[];
}>();

const containerRef = ref<HTMLElement | null>(null);
const width = ref(0);
const height = ref(250); 
const activePoint = ref<any>(null);

const maxY = computed(() => {
  if (!props.data.length) return 10;
  const max = Math.max(...props.data.map(d => d.count), 0);
  return max < 5 ? 5 : Math.ceil(max * 1.2); 
});

const yTicks = computed(() => {
  const step = Math.ceil(maxY.value / 4);
  return Array.from({ length: 5 }, (_, i) => i * step);
});

const points = computed(() => {
  if (!width.value || !props.data.length) return [];
  
  const stepX = width.value / (props.data.length - 1 || 1);
  
  return props.data.map((d, i) => ({
    x: i * stepX,
    y: scaleY(d.count),
    index: i,
    raw: d
  }));
});

const linePath = computed(() => {
  if (points.value.length < 2) return '';
  return getSpline(points.value, 0.4); 
});

const fillPath = computed(() => {
  if (points.value.length < 2) return '';
  const first = points.value[0];
  const last = points.value[points.value.length - 1];
  return `${linePath.value} L ${last.x},${height.value} L ${first.x},${height.value} Z`;
});

function scaleY(val: number) {
  const ratio = val / maxY.value;
  const availableHeight = height.value - 40; // More padding for tooltip space
  return height.value - 20 - (ratio * availableHeight);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function formatDay(dateStr: string) {
  // Parsing date properly to handle timezone issues if necessary, but simple string formatting is safe enough for local
  return new Date(dateStr).getDate();
}

function isActive(index: number) {
  return activePoint.value && activePoint.value.index === index;
}

// Catmull-Rom to Bezier conversion logic for smooth curves
function getSpline(points: any[], tension = 1) {
  if (points.length < 2) return '';
  let d = `M ${points[0].x},${points[0].y}`;
  
  const n = points.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[0];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i !== n - 2 ? points[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6 * tension;
    const cp1y = p1.y + (p2.y - p0.y) / 6 * tension;

    const cp2x = p2.x - (p3.x - p1.x) / 6 * tension;
    const cp2y = p2.y - (p3.y - p1.y) / 6 * tension;

    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

const resizeObserver = new ResizeObserver((entries) => {
  if (entries[0]) {
    width.value = entries[0].contentRect.width;
    height.value = entries[0].contentRect.height || 250;
  }
});

onMounted(() => {
  if (containerRef.value) {
    resizeObserver.observe(containerRef.value);
    width.value = containerRef.value.clientWidth;
    height.value = containerRef.value.clientHeight || 250;
  }
});

onUnmounted(() => {
  resizeObserver.disconnect();
});
</script>


