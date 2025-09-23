// lib/map-template.ts
const mapTemplate = (
  highRiskZones: { coords: [number, number]; radius: number }[],
  userLocation?: [number, number],
  efirs?: { coords: [number, number]; touristId: string }[],
  zoom: number = 14
) => `
<div>
  <style>
    html, body { margin: 0; height: 100%; width: 100%; }
    #map { height: 100%; width: 100%; }
  </style>

  <div id="map"></div>

  <link rel="stylesheet" href="https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.13.0/maps/maps.css"/>
  <script src="https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.13.0/maps/maps-web.min.js"></script>
  <script src="https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.13.0/services/services-web.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@turf/turf@7/turf.min.js"></script>

  <script>
    const apiKey = "${process.env.NEXT_PUBLIC_TOMTOM_KEY}";
    tt.setProductInfo("Smart Tourist App", "1.0");

    const map = tt.map({
      key: apiKey,
      container: "map",
      center: [${userLocation ? userLocation[0] : 83.32345}, ${userLocation ? userLocation[1] : 17.72122}],
      zoom: ${zoom}
    });

    map.on("load", () => {
      // ✅ tell React Native the map is ready
      window.ReactNativeWebView.postMessage("map-ready");

      // ✅ draw high-risk zones
      const zones = ${JSON.stringify(highRiskZones)};
      zones.forEach((zone, i) => {
        const circle = turf.circle(zone.coords, zone.radius / 1000, { steps: 64, units: "kilometers" });
        map.addSource("zone-" + i, { type: "geojson", data: circle });
        map.addLayer({
          id: "zone-" + i,
          type: "fill",
          source: "zone-" + i,
          paint: { "fill-color": "#FF0000", "fill-opacity": 0.3 }
        });
        map.addLayer({
          id: "zone-" + i + "-outline",
          type: "line",
          source: "zone-" + i,
          paint: { "line-color": "#FF0000", "line-width": 2 }
        });
      });

      // ✅ current user location marker
      ${userLocation ? `
        const userMarker = new tt.Marker({ color: "blue" })
          .setLngLat([${userLocation[0]}, ${userLocation[1]}])
          .addTo(map);
        window.ReactNativeWebView.postMessage("User marker added at [${userLocation[0]}, ${userLocation[1]}]");
      ` : `window.ReactNativeWebView.postMessage("No user location provided.");`}

      // ✅ keep track of route
      let routeLayerId = null;
      let originMarker = null;
      let destMarker = null;

      window.drawRoute = async function(origin, destination) {
        try {
          const response = await tt.services.calculateRoute({
            key: apiKey,
            locations: origin.join(",") + ":" + destination.join(",")
          });
          const geojson = response.toGeoJson();

          if (routeLayerId && map.getLayer(routeLayerId)) {
            map.removeLayer(routeLayerId);
            map.removeSource("route");
          }

          map.addSource("route", { type: "geojson", data: geojson });
          routeLayerId = "route-" + Date.now();
          map.addLayer({
            id: routeLayerId,
            type: "line",
            source: "route",
            paint: { "line-color": "#007AFF", "line-width": 6 }
          });

          if (originMarker) originMarker.remove();
          if (destMarker) destMarker.remove();

          originMarker = new tt.Marker({ color: "green" }).setLngLat(origin).addTo(map);
          destMarker = new tt.Marker({ color: "red" }).setLngLat(destination).addTo(map);

          const bounds = new tt.LngLatBounds();
          geojson.features[0].geometry.coordinates.forEach(c => bounds.extend(c));
          map.fitBounds(bounds, { padding: 50 });

        } catch (err) {
          window.ReactNativeWebView.postMessage("Route error: " + err.message);
        }
      };

      // ✅ debug center position when map is dragged
      map.on("dragend", () => {
        const center = map.getCenter();
        window.ReactNativeWebView.postMessage(center.lng.toFixed(5) + ", " + center.lat.toFixed(5));
      });

      // ✅ efirs
      ${(efirs || []).map((efir) => `
        new tt.Marker({ color: "orange" })
          .setLngLat([${efir.coords[0]}, ${efir.coords[1]}])
          .addTo(map);
          window.ReactNativeWebView.postMessage("efir marker added at [${efir.coords[0]}, ${efir.coords[1]}]");
      `).join("")}
    });
  </script>
</div>
`;

export default mapTemplate;
