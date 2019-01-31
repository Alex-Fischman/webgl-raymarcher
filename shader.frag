precision mediump float;
const float NAN = 0.0 / 0.0;
const float MAX = 1000.0;
const float EPSILON = 0.001;
const int ITERATIONS = 5;

/* -------- WORLD TRANSFORMATIONS -------- */
//Both a function on a point and on the final distance
vec3 translateWorld(vec3 p, vec3 translations) {
    return p - translations;
}
float translateWorld(float d, vec3 translations) {
    return d;
}

//Might be broken, too lazy to test
vec3 rotateWorld(vec3 p, vec3 axis, float angle) {
    vec3 dir = normalize(axis);
    float c = cos(angle);
    float s = sin(angle);
    float x = p.x;
    float y = p.y;
    float z = p.z;
    float u = dir.x;
    float v = dir.y;
    float w = dir.z;
    float uxvywz = -u * x - v * y - w * z;
    return vec3(
        -u * uxvywz * (1.0 - c) + x * c + (v * z - w * y) * s,
        -v * uxvywz * (1.0 - c) + y * c + (w * x - u * z) * s,
        -w * uxvywz * (1.0 - c) + z * c + (u * y - v * x) * s
    );
}
float rotateWorld(float d, vec3 axis, float angle) {
    return d;
}

vec3 scaleWorld(vec3 p, float scale) {
    return p / scale;
}
float scaleWorld(float d, float scale) {
    return d * scale;
}

vec3 moduloWorld(vec3 p, vec3 reflections) {
    return mod(p + reflections / 2.0, reflections) - reflections / 2.0;
}
float moduloWorld(float d, vec3 reflections) {
    return d;
}

vec3 reflectWorld(vec3 p, vec3 normal) {
    float dist = dot(normalize(normal), p);
    return p - normalize(normal) * dist * 2.0;
}
float reflectWorld(float d, vec3 normal) {
    return d;
}

vec3 mirrorWorld(vec3 p, vec3 normal) {
    if (dot(p, normal) < 0.0) {
        return reflectWorld(p, normal);
    }
    else {
        return p;
    }
}
float mirrorWorld(float d, vec3 normal) {
    return d;
}

vec3 mengerSpongeWorld(vec3 p, float side) {
    p = scaleWorld(p, 1.0 / 3.0);
    p = mirrorWorld(p, vec3(-1.0, 1.0, 0.0));
    p = mirrorWorld(p, vec3(1.0, 1.0, 0.0));
    p = mirrorWorld(p, vec3(1.0, 0.0, -1.0));
    p = mirrorWorld(p, vec3(1.0, 0.0, 1.0));
    p = mirrorWorld(p, vec3(0.0, 0.0, 1.0));
    p = translateWorld(p, vec3(0.0, 0.0, side / 2.0));
    p = mirrorWorld(p, vec3(0.0, 0.0, 1.0));
    p = translateWorld(p, vec3(side, side, side / 2.0));
    return p;
}
float mengerSpongeWorld(float d, float side) {
    d = scaleWorld(d, 1.0 / 3.0);
    return d;
}

//The world transformation that is used later
float side = 1.0;
vec3 sceneWorld(vec3 p) {
    return mengerSpongeWorld(p, side);
}
float sceneWorld(float d) {
    return mengerSpongeWorld(d, side);
}

/* -------- SIGNED DISTANCE FUNCTIONS -------- */
//Primitive SDFs
float sphereSDF(vec3 p, float diameter) {
    return length(p) - (diameter / 2.0);
}

float cubeSDF(vec3 p, float side) {
    vec3 d = abs(p) - (side / 2.0);
    float insideDistance = min(max(d.x, max(d.y, d.z)), 0.0);
    float outsideDistance = length(max(d, 0.0));
    return insideDistance + outsideDistance;
}

//Operations on SDFs
float intersectSDF(float distA, float distB) {
    return max(distA, distB);
}

float unionSDF(float distA, float distB) {
    return min(distA, distB);
}

float subtractSDF(float distA, float distB) {
    return max(distA, -distB);
}

//The SDF that is used later in the code
float sceneSDF(vec3 p) {
    return cubeSDF(p, 1.0);
}

/* -------- FINAL WORLD-TO-DISTANCE FUNCTION -------- */
//Maps a point to a distance
float map(vec3 p) {
    vec3 pPrime = p;
    for (int i = 0; i < ITERATIONS; ++i) {
        pPrime = sceneWorld(pPrime);
    }
    float d = sceneSDF(pPrime);
    float dPrime = d;
    for (int i = 0; i < ITERATIONS; ++i) {
        dPrime = sceneWorld(dPrime);
    }
    return dPrime;
}

/* -------- LIGHTING AND SHADING -------- */
//Take a point and give it a material (color + reflective properties + position (since we have room))
mat4 getMaterial(vec4 p) {
    float x = length(p.xyz) * 100.0;
    float r = sin(radians(5.0 * (x)));
    float g = sin(radians(5.0 * (x + 120.0)));
    float b = sin(radians(5.0 * (x + 240.0)));
    vec3 sines = vec3(r + 1.0, g + 1.0, b + 1.0) / 2.0;
    vec3 ambient = vec3(1.0, 1.0, 1.0);
    vec3 diffuse = vec3(0.9, 0.9, 0.9);
    vec3 specular = vec3(0.8, 0.8, 0.8);
    float shininess = 1.0;
    return mat4(
        vec4(sines, p.x), 
        vec4(ambient / sqrt(p.w + 1.0), p.y), 
        vec4(diffuse, p.z), 
        vec4(specular, shininess)
    );
}

//Using a calculate the color at a point
vec3 lightMaterial(vec3 p, vec3 eye, mat4 material, mat4 light) {
    vec3 color = material[0].rgb;
    vec3 kAmbient = material[1].rgb;
    vec3 kDiffuse = material[2].rgb;
    vec3 kSpecular = material[3].rgb;
    float alpha = material[3].a;
    
    vec3 lightPos = light[0].xyz;
    vec3 iAmbient = light[1].rgb;
    vec3 iDiffuse = light[2].rgb;
    vec3 iSpecular = light[3].rgb;
    
    vec3 N = normalize(vec3(
        map(vec3(p.x + EPSILON, p.y, p.z)) - 
        map(vec3(p.x - EPSILON, p.y, p.z)),
        map(vec3(p.x, p.y + EPSILON, p.z)) - 
        map(vec3(p.x, p.y - EPSILON, p.z)),
        map(vec3(p.x, p.y, p.z  + EPSILON)) - 
        map(vec3(p.x, p.y, p.z - EPSILON))
    ));
    vec3 L = normalize(lightPos - p);
    vec3 V = normalize(eye - p);
    vec3 R = (2.0 * dot(L, N) * N) - L;
    
    vec3 ambient = kAmbient * iAmbient;
    vec3 diffuse = kDiffuse * dot(L, N) * iDiffuse;
    vec3 specular = kSpecular * pow(dot(R, V), alpha) * iSpecular;
    return color + ambient + diffuse + specular;
}

/* -------- MARCH THE RAY -------- */
//March a ray until it hits the scene
vec4 marchRay(vec3 eye, vec3 dir) {
    vec3 currentPosition = eye;
    for(float i = 0.0; i < MAX; ++i) {
        float distToScene = map(currentPosition);
        if (abs(distToScene) <= EPSILON) {
            return vec4(currentPosition, float(i));
        }
        if (abs(distToScene) > MAX) {
            return vec4(NAN, NAN, NAN, float(i));
        }
        currentPosition += dir * distToScene;
    }
    return vec4(NAN, NAN, NAN, MAX);
}

//Make a ray that goes through the current pixel 
vec3 rayDirection(float fieldOfView, vec2 size, vec2 fragCoord) {
    vec2 xy = fragCoord - size / 2.0;
    float z = size.y / tan(radians(fieldOfView) / 2.0);
    return normalize(vec3(xy, -z));
}

/* -------- MAIN -------- */
uniform vec2 uResolution;
uniform vec3 uEye;
uniform vec3 uBack;
uniform vec3 uUp;
void main() {
    //Create a view matrix
    vec3 b = normalize(uBack);
    vec3 s = normalize(cross(b, uUp));
    vec3 u = normalize(cross(s, b));
    mat4 viewMat = mat4(
        vec4(s, 0.0),
        vec4(u, 0.0),
        vec4(b, 0.0),
        vec4(0.0, 0.0, 0.0, 1.0)
    );
    //March a ray into the scene
    vec3 rayDir = rayDirection(45.0, uResolution, gl_FragCoord.xy);
    vec3 worldDir = (viewMat * vec4(rayDir, 0.0)).xyz;
    vec4 p = marchRay(uEye, worldDir);
    if (!(p.x < 0.0 || 0.0 < p.x || p.x == 0.0)) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
		return;
    }
    //Shade the object that the ray hits
    mat4 material = getMaterial(p);
    vec3 lightPos = vec3(0.0, 5.0, -5.0);
    vec3 ambientLight = vec3(0.5, 0.5, 0.5);
    vec3 diffuseLight = vec3(0.5, 0.5, 0.5);
    vec3 specularLight = vec3(0.5, 0.5, 0.5);
    mat4 light = mat4(
        vec4(lightPos, 0.0),
        vec4(ambientLight, 0.0),
        vec4(diffuseLight, 0.0),
        vec4(specularLight, 0.0)
    );
    gl_FragColor = vec4(lightMaterial(p.xyz, uEye, material, light), 1.0);
    //gl_FragColor = vec4(material[0].rgb, 1.0);
}
