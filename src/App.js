import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl'; 
import * as THREE from 'three';
import "./App.css";
import Details from './Details.jsx';
import Dropdown from './Dropdown.jsx';
import Custom from './Custom.jsx';
import Route from './Route.jsx';

mapboxgl.accessToken = 'pk.eyJ1IjoicG1heGFhIiwiYSI6ImNsaGtheTBsODBxMWUzam54cHFybnJjeDQifQ.0qvtgp64H68vAMDZeIcHcA';

export default function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [buildings, setBuildings] = useState([]);
  const [buildingsLoaded, setBuildingsLoaded] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [filters, setFilters] = useState({dorms: true, corps: true, others: true});
  const [selectedPointForPath, setSelectedPointForPath] = useState({A:'From', B:'To'});
  const ref = useRef(selectedBuilding);
  const [style, setStyle] = useState('streets-v12');
  const layerRef = useRef(null);
  
  const changeStyle = (newStyle) => {
    setStyle(newStyle)
    map.current.setStyle('mapbox://styles/mapbox/' + newStyle);
    map.current.on('style.load', function() {
      if(buildings.length && !map.current.getLayer('campus_tpu')){
        map.current.addLayer(layerRef.current, 'waterway-label');
        setBuildingsLoaded(true);
      }
    });
  }

  const colorRef = useRef('normal');
  
  const changeBuildingsColor = (newColor) => {
    colorRef.current = newColor;
  }
  
  useEffect(() => {ref.current = selectedBuilding}, [selectedBuilding])

  //отображение маршрута на карте
  const buildRoute = (geojson) => {
    if (map.current.getSource('route')) {
      map.current.getSource('route').setData(geojson);
    }
    else {
      map.current.addLayer({
        id: 'route',
        type: 'line',
        source: {
          type: 'geojson',
          data: geojson
        },
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#28be46',
          'line-width': 8,
          'line-opacity': 0.75
        }
      }, "campus_tpu");
    }
  };

  
  const renderBuildings = (buildings, id) => {
    
    // для каждого здания из массива buildings в конец массива точек добавляется первая точка следующего здания 
    for (let i = 0; i < buildings.length - 1; i++){
      let k = buildings[i].geometry.length;
      buildings[i].geometry[k] = buildings[i+1].geometry[0];
    }
    // для каждой точки каждого здания рассчитывается и записывается расстояние до соседней точки (в метрах) и угол
    buildings.forEach((building) => {
      building.geometry.forEach((point) => {
        point.rlat = point.lat * (Math.PI / 180);
        point.rlon = point.lon * (Math.PI / 180);
        point.coslat = Math.cos(point.rlat);
        point.sinlat = Math.sin(point.rlat);
      });
      for (let i = 0; i < building.geometry.length - 1; i++){
        building.geometry[i].dist = new mapboxgl.LngLat(building.geometry[i].lon, building.geometry[i].lat).distanceTo(new mapboxgl.LngLat(building.geometry[i+1].lon, building.geometry[i+1].lat));
        const delta = building.geometry[i+1].rlon - building.geometry[i].rlon;
        const cdelta = Math.cos(delta);
        const sdelta = Math.sin(delta);
        const x =(building.geometry[i].coslat * building.geometry[i+1].sinlat) - (building.geometry[i].sinlat * building.geometry[i+1].coslat * cdelta);
        const y = sdelta * building.geometry[i+1].coslat;
        let z = (Math.atan(-y / x) / Math.PI) * 180;
        if (x < 0) z += 180;
        const z2 = -((z + 180) % 360 - 180) * Math.PI / 180;
        building.geometry[i].anglerad = z2 - (2 * Math.PI * Math.floor(z2 / (2 * Math.PI)));
        building.geometry[i].angledeg = building.geometry[i].anglerad * 180 / Math.PI;
      }
    }); 
    
    //координаты широты и долготы начальной точки переводятся в плолские координаты проекции Меркатора (используемая проекция в карте Mapbox)
    const inMercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat(buildings[0].geometry[0], 0);
    const modelTransform = {
      translateX: inMercatorCoordinate.x,
      translateY: inMercatorCoordinate.y,
      translateZ: inMercatorCoordinate.z,
      rotateX: 0,
      rotateY: 0,
      rotateZ: Math.PI / 2,
      scale: inMercatorCoordinate.meterInMercatorCoordinateUnits()
    };
    
    let INTERSECTED;

    // создание пользовательского слоя со сценой ThreeJS
    const customLayer = {
      ref: ref,
      id: id,
      type: 'custom',
      renderingMode: '3d',
      onAdd: function (map, gl) {
          this.camera = new THREE.OrthographicCamera();
          this.scene = new THREE.Scene();

          const skyColor = 0xb1e1ff; 
          const groundColor = 0xb97a20; 
          this.scene.add(new THREE.AmbientLight(0xffffff, 0.75));
          this.scene.add(new THREE.HemisphereLight(skyColor, groundColor, 0.25));
         
          const directionalLight = new THREE.DirectionalLight(0xffffff);
          directionalLight.position.set(100, 100, 200).normalize();
          this.scene.add(directionalLight);
          
          this.raycaster = new THREE.Raycaster();
          this.raycaster.near = -1;
          this.raycaster.far = 1e6;

          // создание плоского контура для каждого здания (здания строятся относительно друг друга)
          const SHAPES = [];
          const heights = [];
          let x = 0;
          let y = 0;
      
          buildings.forEach((building) => {
            const SHAPE = new THREE.Shape();
            let x1 = x;
            let y1 = y;
            SHAPE.moveTo(x, -y);
            for (let k = 0; k < building.geometry.length - 2; k++){
              const {dist, anglerad} = building.geometry[k];
              x1 += dist * Math.cos(anglerad);
              y1 += dist * Math.sin(anglerad);
              SHAPE.lineTo(x1, -y1);
            }
            SHAPE.lineTo(x, -y);
            SHAPES.push(SHAPE);
            const {dist, anglerad} = building.geometry[building.geometry.length - 2];
            x += dist * Math.cos(anglerad);
            y += dist * Math.sin(anglerad);

            const height = building.tags.height ? building.tags.height : building.tags["building:levels"] ? building.tags["building:levels"] * 4 : 10;
            heights.push(height);
          });
          
          for (let i = 0; i < buildings.length; i++){
            const geometry = new THREE.ExtrudeGeometry(SHAPES[i], {steps: 2, depth: heights[i], bevelEnabled: false,});
            let material;
            if (colorRef.current === 'normal'){
              material = new THREE.MeshNormalMaterial();
            }
            else {
              material = new THREE.MeshStandardMaterial({color: colorRef});
            }
            const edges = new THREE.EdgesGeometry(geometry);
            const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({color: 0x000000}));
            const MESH = new THREE.Mesh(geometry, material);
            let name;
            if (buildings[i].id === '162156693'){
              name = '39666332';
            }
            else if ([156183858, 156030850, 146861097].includes(buildings[i].id)){
              name = '39662300';
            }
            else if ([125835983, 39664711].includes(buildings[i].id)){
              name = '100256175';
            }
            else{
              name = buildings[i].id;
            }
            
            MESH.name = name;
            line.name = name;
            line.visible = false;
            this.scene.add(MESH);
            this.scene.add(line);
          } 
          
          this.map = map; 

          this.renderer = new THREE.WebGLRenderer({
          canvas: map.getCanvas(),
          context: gl,
          antialias: true
          });
          
          this.renderer.autoClear = false;
      },
          
      render: function (gl, matrix) {
          //приведение размеров и местооположения сцены к карте Mapbox
          const rotationX = new THREE.Matrix4().makeRotationAxis(
          new THREE.Vector3(1, 0, 0),
          modelTransform.rotateX
          );
          const rotationY = new THREE.Matrix4().makeRotationAxis(
          new THREE.Vector3(0, 1, 0),
          modelTransform.rotateY
          );
          const rotationZ = new THREE.Matrix4().makeRotationAxis(
          new THREE.Vector3(0, 0, 1),
          modelTransform.rotateZ
          );
      
          const m = new THREE.Matrix4().fromArray(matrix);
          const l = new THREE.Matrix4()
          .makeTranslation(
          modelTransform.translateX,
          modelTransform.translateY,
          modelTransform.translateZ
          )
          .scale(
          new THREE.Vector3(
          modelTransform.scale,
          -modelTransform.scale,
          modelTransform.scale
          )
          )
          .multiply(rotationX)
          .multiply(rotationY)
          .multiply(rotationZ);

          this.scene.children.forEach((child) => {
            if (child.name && child.type === "Mesh"){            
              if (child.name === ref.current){
                child.material = new THREE.MeshStandardMaterial({color: 0x979aaa});
                child.material.emissive.setHex( 0xff4460 );
              }
              else {
                if (colorRef.current === 'normal'){
                  child.material = new THREE.MeshNormalMaterial();
                }
                else{
                  child.material = new THREE.MeshStandardMaterial({color: colorRef.current});
                  child.material.emissive.setHex( 0x000000 );
                }
              }
            }
          })
  
          this.camera.projectionMatrix = m.multiply(l);
          this.renderer.resetState();
          this.renderer.render(this.scene, this.camera);
          this.map.triggerRepaint();
      },

      raycast: function(point){
        let mouse = new THREE.Vector2();
        mouse.x = (point.x / this.map.transform.width) * 2 - 1;
        mouse.y = 1 - (point.y / this.map.transform.height) * 2;
        const camInverseProjection = this.camera.projectionMatrix.invert();
        const cameraPosition = new THREE.Vector3().applyMatrix4(camInverseProjection);
        const mousePosition = new THREE.Vector3(mouse.x, mouse.y, 1).applyMatrix4(camInverseProjection);
        const viewDirection = mousePosition.clone().sub(cameraPosition).normalize();
        this.raycaster.set(cameraPosition, viewDirection);
        
        return this.raycaster.intersectObjects(this.scene.children, true);
      },

      raycastSelect: function(point){
        const intersects = this.raycast(point);
        if ( intersects.length > 0 ) {
					if ( INTERSECTED !== intersects[ 0 ].object ) {
						INTERSECTED = intersects[ 0 ].object;
            setSelectedBuilding(intersects?.[0]?.object?.name); 
          }
				} 
        else {
					INTERSECTED = null;
          setSelectedBuilding(null); 
				}
      },

      raycastHover: function(point){
        const intersects = this.raycast(point);
        if ( intersects.length > 0 ) {
          const name = intersects?.[0]?.object?.name
					this.scene.children.find(child => child.name === name && child.type === "LineSegments").visible = true;
          this.scene.children.forEach(child => {if(child.type === "LineSegments" && child.name !== name) child.visible = false;});
				} 
        else {
          this.scene.children.forEach(child => {if(child.type === "LineSegments") child.visible = false;});
        }
      }
    };

    layerRef.current = customLayer;

    map.current.on('click', (e) => {
      if(map.current.getLayer('campus_tpu')){
        customLayer.raycastSelect(e.point);
      }
    });

    map.current.on('mousemove', (e) => {
      if(map.current.getLayer('campus_tpu')){
        customLayer.raycastHover(e.point);
      }
    })

    return customLayer;
  };

  useEffect(() => {
    if (map.current) return; // initialize map only once
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/' + style,
      center: [84.9544944, 56.4622565],
      zoom: 16,
      pitch: 70,
      antialias: true
    });
  });

  

  useEffect(() => {
    const request_dorms = `way["name"~"Общежитие.+ТПУ"];`;
    const request_dor = `way["name"~"Общежитие.+ТПУ"]->.b;`;
    const request_others = `(way(111310517);way(104358769);way(110485912);way(69741679);way(111305524);way(39662709);way(624382398);way(39662709);way(488169973);way(624346444);)->.a; .a`
    const request_oth = `(way(111310517);way(104358769);way(110485912);way(69741679);way(111305524);way(39662709);way(624382398);way(39662709);way(488169973);way(624346444);)->.a;`
    const request_corps = request_oth + request_dor + '(way["name"~"ТПУ"]; - way.a;)->.c;(way.c; - way.b;)->.d; .d'
    let request = 'way["name"~"ТПУ"];';

    if(filters.dorms && !filters.corps && !filters.others){
      request = request_dorms;
    }
    else if(filters.dorms && filters.corps && !filters.others){
      request = request_oth + '(way["name"~"ТПУ"]; - way.a;);';
    }
    else if(filters.dorms && !filters.corps && filters.others){
      request = request_oth + request_dor +'(way.a;way.b;);';
    }
    else if(!filters.dorms && filters.corps && !filters.others){
      request = request_corps;
    }
    else if(!filters.dorms && filters.corps && filters.others){
      request = request_dor + '(way["name"~"ТПУ"]; - way.b;);';
    }
    else if(!filters.dorms && !filters.corps && filters.others){
      request = request_others;
    }
    else if(!filters.dorms && !filters.corps && !filters.others){
      request = '';
    }

    const api = fetch('https://www.overpass-api.de/api/interpreter?', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body:`[out:json][timeout:90][bbox:56.45056248681306,84.93774890899658,
          56.47221033519271,84.98302459716797];${request} out geom;`
    });
    api.then((data) => {
      data.text().then((result) => {
        result = JSON.parse(result);
        const elements = result.elements;
        const data = elements.map((item) => {
          return {
            id: item.id,
            tags: item.tags,
            geometry: item.geometry,
          }
        });
        setBuildings(data);
        setBuildingsLoaded(false);
      })
    });
  }, [filters]);

  useEffect(() => {
    if(map.current){
      if(map.current.getLayer('campus_tpu')) map.current.removeLayer('campus_tpu');
      if(!buildingsLoaded && buildings.length){
        map.current.addLayer(renderBuildings(buildings, 'campus_tpu'), 'waterway-label');
        setBuildingsLoaded(true);
      }
    }
  }, [buildings]);


  
  return (
    <div>
      <Dropdown placeHolder="Найти..." options={buildings} selectedBuilding={selectedBuilding} setSelectedBuilding={setSelectedBuilding}/>
      <div ref={mapContainer} style={{height:'100vh'}}/>
      {selectedBuilding != null && <Details id={selectedBuilding} onChange={(value) => map.current.flyTo({center: [value.lon, value.lat], zoom: 18})}/>}
      <div className='buttons_div'>
        <Custom filters={filters} setFilters={setFilters} style={style} changeStyle={changeStyle} changeBuildingsColor={changeBuildingsColor}/>
        <Route buildings={buildings} selectedPointForPath={selectedPointForPath} setSelectedPointForPath={setSelectedPointForPath} buildRoute={buildRoute}/>
      </div>
    </div>
  );
}

