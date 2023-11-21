const NS = 'http://www.w3.org/2000/svg';
const canvas = document.querySelector('#canvas');
const eraser = document.querySelector('#eraser');
const colour = document.querySelector('#colour');
const weight = document.querySelector('#weight');
const select = document.querySelector('#select');
const rotate = document.querySelector('#rotate');
const savePen = document.querySelector('#save-pen');
const modeToggle = document.querySelector('#mode');
const pens = document.querySelector('#pens');

let mode = 'draw';

let currPath = null;
let selected = null;
let rotating = false;
let rotrad = 0; // rotation radians

const distSq = ([ax, ay], [bx, by]) => (ax - bx) ** 2 + (ay - by) ** 2;

const savedPens = JSON.parse(localStorage.getItem('savedPens') || '[]');

const resetSelected = () => {
    selected = null;
    rotating = false;
    rotrad = prevrotrad = 0;
    select.setAttribute('x', -500);
    select.setAttribute('y', -500);
    select.setAttribute('width', 0);
    select.setAttribute('height', 0);
    rotate.setAttribute('transform', 'translate(-500, -500)');
};

const updateSelected = (updateBound = true) => {
    const rect = selected.getBoundingClientRect();
    if (updateBound) {
        select.setAttribute('x', rect.x);
        select.setAttribute('y', rect.y);
        select.setAttribute('width', rect.width);
        select.setAttribute('height', rect.height);
        rotate.setAttribute('transform', `translate(${rect.x + rect.width / 2}, ${rect.y})`);
    }
    rotate.parentElement.setAttribute('transform', `rotate(${rotrad * 180 / Math.PI} ${rect.x + rect.width / 2} ${rect.y + rect.height / 2})`);
};

// We seem to be creating many empty lines, and rather than actually deal with them, let's just sweep it under the rug
const cleanupLines = () => {
    canvas.querySelectorAll('polyline').forEach(l => {
        if (!l.getAttribute('points')?.length) {
            l.remove();
        }
    });
};
setInterval(cleanupLines, 5000);

const renderSavedPens = () => {
    [...pens.children].forEach(c => c.remove());
    for (const i in savedPens) {
        const pen = savedPens[i];
        const btn = document.createElement('button');
        btn.addEventListener('click', () => {
            colour.value = pen.colour;
            weight.value = pen.weight;
        });
        btn.classList.add('pen');
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', '-40 -40 80 80');
        svg.setAttribute('xmlns', NS);
        const circle = document.createElementNS(NS, 'circle');
        circle.setAttribute('r', pen.weight);
        circle.setAttribute('cx', -5);
        circle.setAttribute('cy', -5);
        circle.setAttribute('fill', pen.colour);
        circle.setAttribute('stroke', 'none');
        svg.appendChild(circle);
        btn.appendChild(svg);
        pens.appendChild(btn);
    }
};

renderSavedPens();

savePen.addEventListener('click', () => {
    if (!savedPens.some(p => p.colour === colour.value && p.weight === weight.value)) {
        savedPens.push({ colour: colour.value, weight: weight.value });
        renderSavedPens();
    }
    localStorage.setItem('savedPens', JSON.stringify(savedPens));
});

modeToggle.addEventListener('click', (event) => {
    const modes = ['draw', 'select'];
    mode = modes[(modes.indexOf(mode) + 1) % modes.length]
    event.target.textContent = mode[0].toUpperCase() + mode.substring(1);
});

weight.addEventListener('input', (event) => {
    if (mode === 'select' && selected) {
        selected.setAttribute('stroke-width', event.target.value);
    }
});

colour.addEventListener('input', (event) => {
    if (mode === 'select' && selected) {
        selected.setAttribute('stroke', event.target.value);
    }
});

const createPolyLine = (col = colour.value, w = weight.value) => {
    const line = document.createElementNS(NS, 'polyline');
    line.setAttribute('stroke', col);
    line.setAttribute('stroke-width', w);
    line.setAttribute('fill', 'none');
    line.setAttribute('points', '');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('stroke-linejoin', 'round');
    //line.setAttribute('stroke-dasharray', 4);
    return line;
}

canvas.addEventListener('mousedown', (event) => {
    const curr = [event.clientX, event.clientY];
    prev = curr;

    if (mode === 'draw') {
        if (event.buttons === 2) {
            eraser.setAttribute('cx', curr[0]);
            eraser.setAttribute('cy', curr[1]);
            eraser.setAttribute('r', weight.value);
            canvas.classList.add('hide-cursor');
        }

        if (event.buttons === 1) {
            currPath = createPolyLine();
            canvas.insertBefore(currPath, canvas.children[0]);
        }
    } else if (mode === 'select') {
        if (event.buttons === 1 && event.target !== canvas) {
            if (event.target.tagName === 'polyline') {
                resetSelected();
                selected = event.target;
                updateSelected();
            } else if (event.target.tagName === 'circle' && event.target.parentElement.id === 'rotate') {
                rotating = true;
            } else {
                resetSelected();
            }
        }
    }
    prevButtons = event.buttons;

    console.log('mousedown', event);
});

let prevButtons;
canvas.addEventListener('mouseup', (event) => {
    if (mode === 'draw') {
        if (prevButtons === 1) {
            const currPoints = currPath.getAttribute('points');
            const newPoints = currPoints.length === 0 ? `${prev.join(',')} ${prev.join(',')}` : `${currPoints} ${prev.join(',')}`;
            currPath.setAttribute('points', newPoints);
        }

        canvas.classList.remove('hide-cursor');
    } else if (mode === 'select') {
        if (event.target === canvas) {
            resetSelected();
        }
    }
    currPath = null;
    prev = null;
    rotating = false;
    console.log('mouseup', event);

    eraser.setAttribute('cx', -500);
    eraser.setAttribute('cy', -500);
});

let prev = null;
let prevrotrad = 0;
canvas.addEventListener('mousemove', (event) => {
    if (!event.buttons || !prev) return;
    //console.log('mousemove', event);

    const curr = [event.clientX, event.clientY];
    if (mode === 'draw') {
        if (event.buttons === 1) { // marker
            const steps = Math.floor(Math.sqrt(distSq(curr, prev)) / 5);

            const dx = (curr[0] - prev[0]) / steps;
            const dy = (curr[1] - prev[1]) / steps;

            const pastCurr = ([x, y]) => {
                const [ux, uy] = [dx ? dx / Math.abs(dx) : 0, dy ? dy / Math.abs(dy) : 0];
                const [ox, oy] = curr;

                if (ux === 0 && uy === 0)
                    return true;
                if (ux === 0 && uy === 1)
                    return y >= oy;
                if (ux === 0 && uy === -1)
                    return y <= oy;

                if (ux === 1 && uy === 0)
                    return x >= ox;
                if (ux === 1 && uy === 1)
                    return y >= oy || x >= ox;
                if (ux === 1 && uy === -1)
                    return x >= ox || y <= oy;

                if (ux === -1 && uy === 0)
                    return x <= ox;
                if (ux === -1 && uy === 1)
                    return x <= ox || y >= oy;
                if (ux === -1 && uy === -1)
                    return x <= ox || y <= oy;

                return true;
            }

            for (const c = prev; !pastCurr(c); c[0] += dx, c[1] += dy) {
                currPath.setAttribute('points', `${currPath.getAttribute('points')} ${c[0].toFixed(2)},${c[1].toFixed(2)}`.trimStart());

                prev = [c[0], c[1]];
            }
        } else if (event.buttons === 2) { // point eraser
            eraser.setAttribute('cx', curr[0]);
            eraser.setAttribute('cy', curr[1]);
            for (const elt of canvas.querySelectorAll('polyline')) {
                const points = elt.getAttribute('points').split(' ');
                const toRemove = [];
                for (const i in points) {
                    const a = points[+i].split(',').map(Number);
                    if (distSq(curr, a) <= weight.value ** 2) {
                        toRemove.push(+i);
                    }
                }

                if (toRemove.length) {
                    toRemove.sort((a, b) => a - b);
                    const slices = thingy(toRemove);
                    for (const slice of slices) {
                        const s = points.slice(...slice);
                        if (s.length === 1) slice.push(slice[0]);
                        console.log(s);
                        const l = createPolyLine(elt.getAttribute('stroke'), elt.getAttribute('stroke-width'));
                        l.setAttribute('points', s.join(' '));
                        canvas.insertBefore(l, elt);
                    }
                    elt.remove();
                }
            }
        } else if (event.buttons === 3) { // stroke eraser
            eraser.setAttribute('cx', curr[0]);
            eraser.setAttribute('cy', curr[1]);
            for (const elt of canvas.querySelectorAll('polyline')) {
                const points = elt.getAttribute('points').split(' ');
                for (let i in points) {
                    if (distSq(curr, points[+i].split(',').map(Number)) <= weight.value ** 2) {
                        elt.remove();
                        break;
                    }
                }

            }
        }
    } else if (mode === 'select') {
        if (rotating) {
            const rect = selected.getBoundingClientRect();
            const mid = [rect.x + rect.width / 2, rect.y + rect.height / 2];
            let vec = [mid[0] - curr[0], mid[1] - curr[1]]; // vec from centre to mouse
            let mag = Math.sqrt(vec[0] ** 2 + vec[1] ** 2); // |vec|
            rotrad = Math.acos(vec[1] / mag);
            if (curr[0] < mid[0]) {
                rotrad *= -1;
            }

            const SNAPS = [0, Math.PI / 2, -Math.PI / 2, Math.PI, -Math.PI];
            if (!event.shiftKey) {
                for (const snap of SNAPS) {
                    if (Math.abs(rotrad - snap) <= .1) {
                        rotrad = snap;
                        break;
                    }
                }
            }

            const drotrad = prevrotrad - rotrad;
            const cosphi = Math.cos(-drotrad);
            const sinphi = Math.sin(-drotrad);
            const points = selected.getAttribute('points').split(' ');
            selected.setAttribute('points', points.map(p => {
                let [x, y] = p.split(',').map(Number);
                const qx = mid[0] + cosphi * (x - mid[0]) - sinphi * (y - mid[1])
                const qy = mid[1] + sinphi * (x - mid[0]) + cosphi * (y - mid[1])
                return `${qx},${qy}`
            }).join(' '));
            updateSelected(false);
            prev = curr;
            prevrotrad = rotrad;

        } else if (selected !== null) {
            const points = selected.getAttribute('points').split(' ');
            const [ dx, dy ] = [curr[0] - prev[0], curr[1] - prev[1]];

            const newpts = points.map(pt => {
                const p = pt.split(',').map(Number);
                p[0] += dx;
                p[1] += dy;
                return p.join(',');
            });

            selected.setAttribute('points', newpts.join(' '));

            updateSelected();

            prev = curr;
        }
    }

});

const thingy = (arr) => {
    const out = [];
    let p = -1;
    for (const n of arr) {
        if (n - p > 1) {
            out.push([p + 1, n]);
        }
        p = n;
    }
    out.push([p + 1]);
    return out;
}

canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
});
