import * as THREE from '../build/three.module.js';
		import { GLTFLoader } from './jsm/loaders/GLTFLoader.js';
		import { EffectComposer } from './jsm/postprocessing/EffectComposer.js';
		import { RenderPass } from './jsm/postprocessing/RenderPass.js';
		import { ShaderPass } from './jsm/postprocessing/ShaderPass.js';
		import { OutlinePass } from './jsm/postprocessing/OutlinePass.js';
		import { FXAAShader } from './jsm/shaders/FXAAShader.js';

		// import { CSS2DRenderer, CSS2DObject } from './jsm/renderers/CSS2DRenderer.js';
    import * as UTIL from './utils.js';

		// let hasEnteredScene = false;

		let labelText;

		let rotateCamera = true;

		let camera, renderer, labelRenderer;
		let composer, effectFXAA, outlinePass;
		let pano1, pano2, pano3;
		let clickableCircles = [];
		let stickyNoteObjects = [];

		// let listOfClickedObjects = []
		// let commentBalls = []

		let isUserInteracting = false,
			onPointerDownMouseX = 0, onPointerDownMouseY = 0,
			lon = 0, onPointerDownLon = 0,
			lat = 0, onPointerDownLat = 0,
			phi = 0, theta = 0;

		let currentPoint = { x: 0, y: 0, z: 0 };
		let currentlyHoveringOverAnObject = false;
		let nameOfObject = "";
		let mouseInCanvas = true;
		let objectNormal = new THREE.Vector3(0, 0, 0);
		let clickedObjectNormal = new THREE.Vector3(0, 0, 0);

		let pickableMeshes = [];

		let currentCircle = 0;

		let currentlyHoveringOverCircle = false;
		let currentlyHoveringOverSticky = false;
		let commentToShow = "";
		let addTextToMouse = false;

		// let colorBy = true //true = comment emotion, false = department

		const raycaster = new THREE.Raycaster();
		// const rayOrigin = new THREE.Vector3(- 3, 0, 0)
		let rayDirection = new THREE.Vector3(10, 0, 0)

		//DEFINE CLASS

		class PickHelper {
			constructor() {
				this.raycaster = new THREE.Raycaster();
				this.pickedObject = null;
				this.pickedObjectSavedMaterial = null;
				this.selectMaterial = new THREE.MeshBasicMaterial();
				// this.infoElem = document.querySelector('#info');
			}
			pick(normalizedPosition, scene, camera) {

				// if (setInfo) {
				// restore the color if there is a picked object
				if (this.pickedObject) {
					this.pickedObject.material = this.pickedObjectSavedMaterial;
					this.pickedObject = undefined;
					// this.infoElem.textContent = '';
				}

				// cast a ray through the frustum
				// console.log(normalizedPosition)
				this.raycaster.setFromCamera(normalizedPosition, camera);
				// console.log(pickableMeshes.length)
				// get the list of objects the ray intersected
				const intersectedCircleObjects = this.raycaster.intersectObjects(clickableCircles);
				if(intersectedCircleObjects.length == 1){
					let nameOfCircle = intersectedCircleObjects[0].object.userData.name
					console.log("hoveringOverACircle "+ nameOfCircle);
					currentlyHoveringOverCircle = true;
					currentCircle = nameOfCircle;
					hoverStickyNote.material.opacity = 0.0
				}else{
					hoverStickyNote.material.opacity = 1.0
					currentlyHoveringOverCircle = false;
					const intersectedStickyObjects = this.raycaster.intersectObjects(stickyNoteObjects);
					if(intersectedStickyObjects.length == 1){
						let stickyData = intersectedStickyObjects[0].object.userData
						console.log("hoveringOverASticky "+ intersectedStickyObjects[0].object.material.opacity); //.comment
						currentlyHoveringOverSticky = true;
						// currentCircle = nameOfCircle;
						hoverStickyNote.material.opacity = 0.0
						addTextToMouse = true;
						commentToShow = stickyData.comment;
						labelText.innerHTML = commentToShow;
					}else{
						hoverStickyNote.material.opacity = 1.0
						addTextToMouse = false;
						labelText.innerHTML = "";
						// currentlyHoveringOverCircle = false;
					}
					const intersectedObjects = this.raycaster.intersectObjects(pickableMeshes);
				// console.log(intersectedObjects)
				if (intersectedObjects.length && mouseInCanvas) {
					currentlyHoveringOverAnObject = true
					// pick the first object. It's the closest one
					// console.log(intersectedObjects[0])
					objectNormal = intersectedObjects[0].face.normal;
					// console.log(objectNormal)
					currentPoint.x = intersectedObjects[0].point.x;
					currentPoint.y = intersectedObjects[0].point.y;
					currentPoint.z = intersectedObjects[0].point.z;
					nameOfObject = intersectedObjects[0].object.name
					this.pickedObject = intersectedObjects[0].object;
					console.log(intersectedObjects[0].object.name)

					if (labelText.innerHTML == ""){
						labelText.innerHTML = intersectedObjects[0].object.name
					}
					// save its color
					this.pickedObjectSavedMaterial = this.pickedObject.material;
					let opaqueMaterial = this.pickedObject.material.clone()
					// this.pickedObject.material = this.selectMaterial;
					// flash select material color to flashing red/yellow
					// this.selectMaterial.color.setHex(0xFF0000);
					// this.pickedObject.material.opacity = 1
					opaqueMaterial.opacity = 0;
					this.pickedObject.material = opaqueMaterial

					// const selectedObject = intersects[ 0 ].object;
					// addSelectedObject( selectedObject );

					outlinePass.selectedObjects = [];
					let selectedObjs = [];
					selectedObjs.push(this.pickedObject)

					outlinePass.selectedObjects = selectedObjs;
					// this.infoElem.textContent = this.pickedObject.name;
				} else {
					currentlyHoveringOverAnObject = false
				}
				}
				
				// }
			}

		}

		const pickPosition = { x: 0, y: 0 };
		const pickHelper = new PickHelper();

		let container;

		let hoverStickyNote;

		let stickyNoteArray = [];

		let gltfLoaded = false;



		init();
		// animate();

		function init() {


      //SET UP SCENE
			{
        container = document.getElementById('container');
				labelText = document.getElementById('label')
			scene = new THREE.Scene();

			camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 600);
    }

      //CREATE THE 3 PANO GEOMETRY
      {
				{const geometry1 = new THREE.SphereBufferGeometry(500, 60, 40);
			// invert the geometry on the x-axis so that all of the faces point inward
			geometry1.scale(- 1, 1, 1);

			const texture = new THREE.TextureLoader().load('textures/equirectangular/pano1-2.jpg');
			const material = new THREE.MeshBasicMaterial({ map: texture});

			pano1 = new THREE.Mesh(geometry1, material);
			pano1.rotateY(-2.75)
			pano1.position.set(-0.998, 0.026, 1.188)

			scene.add(pano1);}
			

				{const geometry1 = new THREE.SphereBufferGeometry(500, 60, 40);
			// invert the geometry on the x-axis so that all of the faces point inward
			geometry1.scale(- 1, 1, 1);

			const texture = new THREE.TextureLoader().load('textures/equirectangular/pano2-2.jpg');
			const material = new THREE.MeshBasicMaterial({ map: texture});

			pano2 = new THREE.Mesh(geometry1, material);
			pano2.rotateY(0.14)
			pano2.position.set(0.015, 0.026, 2.336)


			scene.add(pano2);}
			

			
			
				{const geometry1 = new THREE.SphereBufferGeometry(500, 60, 40);
			// invert the geometry on the x-axis so that all of the faces point inward
			geometry1.scale(- 1, 1, 1);

			const texture = new THREE.TextureLoader().load('textures/equirectangular/pano3-2.jpg');
			const material = new THREE.MeshBasicMaterial({ map: texture});

			pano3 = new THREE.Mesh(geometry1, material);
			pano3.rotateY(2.45)
			pano3.position.set(1.052, 0.026, -2.874)

			


			scene.add(pano3);}
        }
	
        //DRAW 3 THE CIRCLES ON THE GROUND

        let circle;

				

        circle = UTIL.drawCircles({x:-0.998, y:-1.8, z:-1.188}, 0)
        clickableCircles.push(circle)
        scene.add(circle)

        circle = UTIL.drawCircles({x:0.015, y:-1.8, z:2.336}, 1)
        clickableCircles.push(circle)
        scene.add(circle)

        circle = UTIL.drawCircles({x:1.052, y:-1.8, z:-2.874}, 2)
        clickableCircles.push(circle)
        scene.add(circle)

        
			const ambientLight = new THREE.AmbientLight(0xffffff, 1.52)
			scene.add(ambientLight)


			const loader = new GLTFLoader().setPath('models/gltf/');
			loader.load('residentRoom3.glb', function (gltf) {

				let scale = 1.0;
				gltf.scene.traverse(function (child) {

					if (child.isMesh) {
						child.material.opacity = 0;
						child.material.transparent = true;
						pickableMeshes.push(child);
					}
				});
				scene.add(gltf.scene);
				animate();
				gltfLoaded = true;
			});

			//FIREBASE GET

			function snapshotToArray(snapshot) {
				var returnArr = [];

				snapshot.forEach(function (childSnapshot) {
					var item = childSnapshot.val();
					item.key = childSnapshot.key;

					returnArr.push(item);
				});

				return returnArr;
			};

			let cube;

			// Resident
			// Family
			// Staff
			// Official
			// Veteran
			// Other

			let depts = ["Resident", "Family", "Staff", "Official", "Veteran", "Other"]

			for(let l = 0; l < depts.length; l++){
				var starCountRef = firebase.database().ref('/department-'+depts[l]+'/').once('value').then(function (snapshot) {
					// currentArrayNumM = 0;
					let nurseData = (snapshotToArray(snapshot));
					// console.log(nurseData)
					for (let i = 0; i < nurseData.length; i++) {
						for (let j = 0; j < nurseData[i].length; j++) {
							// console.log(nurseData[i])
	
							cube = new THREE.Mesh(
								new THREE.CubeGeometry(0.1, 0.1, 0.01),
								new THREE.MeshBasicMaterial({ color: 0x173F5F, transparent: true, opacity:1.0 }),
							);
	
							cube.lookAt(nurseData[i][j].vec.x, nurseData[i][j].vec.y, nurseData[i][j].vec.z)
							cube.position.x = nurseData[i][j].pos.x
							cube.position.y = nurseData[i][j].pos.y
							cube.position.z = nurseData[i][j].pos.z
	
							
							cube.userData.comment = nurseData[i][j].comment
							cube.userData.element = nurseData[i][j].element
							cube.userData.emotion = nurseData[i][j].emo
							cube.userData.name = nurseData[i].key
							cube.userData.dept = depts[l];
							// console.log(nurseData[i].key)
	
							if(nurseData[i][j].emo == "positvea"){
								cube.material.color = new THREE.Color(0xFF0000);
							}else if(nurseData[i][j].emo == "neutrala"){
								cube.material.color = new THREE.Color(0x00FF00);
							}else{
								cube.material.color = new THREE.Color(0x173F5F);
							}
							// console.log(cube.material)
	
							stickyNoteArray.push(cube)
							stickyNoteObjects.push(cube)
	
							
	
							scene.add(cube)
						}
					}
					// scene.add(stickyNoteArray)
					// console.log(nurseData)
	
					
					
				})
			}

			

			

			// console.log(pickableMeshes)

			hoverStickyNote = new THREE.Mesh(
				new THREE.CubeGeometry(0.1, 0.1, 0.01),
				new THREE.MeshBasicMaterial({ color: 0xaaaaFF, transparent: true, opacity:1.0 }),
			);
			scene.add(hoverStickyNote)


			renderer = new THREE.WebGLRenderer();
			renderer.setPixelRatio(window.devicePixelRatio);
			renderer.setSize(window.innerWidth, window.innerHeight);
			container.appendChild(renderer.domElement);

			// labelRenderer = new CSS2DRenderer();
			// 	labelRenderer.setSize( window.innerWidth, window.innerHeight );
			// 	labelRenderer.domElement.style.position = 'absolute';
			// 	labelRenderer.domElement.style.top = '0px';

				// let LUKESPAN = document.getElementById('tooltip')
				// LUKESPAN.className = "LUKE"

			composer = new EffectComposer(renderer);

			const renderPass = new RenderPass(scene, camera);
			composer.addPass(renderPass);

			outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);
			composer.addPass(outlinePass);

			const textureLoader = new THREE.TextureLoader();
			textureLoader.load('textures/tri_pattern.jpg', function (texture) {

				outlinePass.patternTexture = texture;
				texture.wrapS = THREE.RepeatWrapping;
				texture.wrapT = THREE.RepeatWrapping;

			});

			effectFXAA = new ShaderPass(FXAAShader);
			effectFXAA.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
			composer.addPass(effectFXAA);

			outlinePass.edgeStrength = 10;

			outlinePass.edgeGlow = 1;
			outlinePass.edgeThickness = 4


			container.style.touchAction = 'none';
			container.addEventListener('pointerdown', onPointerDown, false);

			// document.addEventListener('wheel', onDocumentMouseWheel, false);

			//

			document.addEventListener('dragover', function (event) {

				event.preventDefault();
				event.dataTransfer.dropEffect = 'copy';

			}, false);

			document.addEventListener('dragenter', function () {

				document.body.style.opacity = 0.5;

			}, false);

			document.addEventListener('dragleave', function () {

				document.body.style.opacity = 1;

			}, false);

			// document.addEventListener('drop', function (event) {

			// 	event.preventDefault();

			// 	const reader = new FileReader();
			// 	reader.addEventListener('load', function (event) {

			// 		material.map.image.src = event.target.result;
			// 		material.map.needsUpdate = true;

			// 	}, false);
			// 	reader.readAsDataURL(event.dataTransfer.files[0]);

			// 	document.body.style.opacity = 1;

			// }, false);

			//

			window.addEventListener('resize', onWindowResize, false);

		}





		let cubeNumber = 0;
		var doClickOnRelease = false;

		function onWindowResize() {

			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();

			// renderer.setSize(window.innerWidth, window.innerHeight);

			renderer.setSize(window.innerWidth, window.innerHeight);
			composer.setSize(window.innerWidth, window.innerHeight);
			// labelRenderer.setSize( window.innerWidth, window.innerHeight );

			effectFXAA.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);

		}

		function onPointerDown(event) {
			if(hasEnteredScene){
				rotateCamera = false;
				console.log("hello")
			}

			if (event.isPrimary === false) return;

			isUserInteracting = true;

			onPointerDownMouseX = event.clientX;
			onPointerDownMouseY = event.clientY;

			onPointerDownLon = lon;
			onPointerDownLat = lat;

			document.addEventListener('pointermove', onPointerMove, false);
			document.addEventListener('pointerup', onPointerUp, false);


		}


		// // clearPickPosition();

		function onPointerMove(event) {

			if (event.isPrimary === false) return;

			lon = (onPointerDownMouseX - event.clientX) * 0.1 + onPointerDownLon;
			lat = (event.clientY - onPointerDownMouseY) * 0.1 + onPointerDownLat;

		}

		function onPointerUp() {
			if(hasEnteredScene){
				rotateCamera = false;
				console.log("hello")
			}

			if (event.isPrimary === false) return;

			isUserInteracting = false;

			document.removeEventListener('pointermove', onPointerMove);
			document.removeEventListener('pointerup', onPointerUp);

		}

		// function onDocumentMouseWheel(event) {

		// 	const fov = camera.fov + event.deltaY * 0.05;

		// 	camera.fov = THREE.MathUtils.clamp(fov, 10, 75);

		// 	camera.updateProjectionMatrix();

		// }

		function animate() {

			requestAnimationFrame(animate);
			update();

		}

		// function resizeRendererToDisplaySize(renderer) {
		//     const canvas = renderer.domElement;
		//     const width = canvas.clientWidth;
		//     const height = canvas.clientHeight;
		//     const needResize = canvas.width !== width || canvas.height !== height;
		//     if (needResize) {
		//       renderer.setSize(width, height, false);
		//     }
		//     return needResize;
		//   }

		function update() {

			if(gltfLoaded){

				for(let i=0;i<stickyNoteArray.length;i++){

					let tempArray = [];
					for(let j = 0; j < pickableMeshes.length; j++){
						tempArray.push(pickableMeshes[j]);
					}
					tempArray.push(stickyNoteObjects[i])

					// console.log(tempArray)
					let rayDirection = new THREE.Vector3(stickyNoteArray[i].position.x - camera.position.x, stickyNoteArray[i].position.y - camera.position.y, stickyNoteArray[i].position.z - camera.position.z);
					// console.log(rayDirection)
					rayDirection.normalize()
					raycaster.set(camera.position, rayDirection)
					
					let interectionObjs = raycaster.intersectObjects(tempArray)
					if(interectionObjs.length > 0){
						// console.log(interectionObjs)
						if(interectionObjs[0].object.userData.hasOwnProperty("emotion")){
							stickyNoteArray[i].material.opacity = 1.0;
							if(colorBy){
								if(interectionObjs[0].object.userData.emotion == "positvea"){
									stickyNoteArray[i].material.color = new THREE.Color(0x3CAEA3)
									if(checkedEmos.includes("positivea.")){
										stickyNoteArray[i].visible = true
									}else{
										stickyNoteArray[i].visible = false
									}
								}else if(interectionObjs[0].object.userData.emotion == "neutrala"){
									stickyNoteArray[i].material.color = new THREE.Color(0xF6D55C)
									if(checkedEmos.includes("neutrala.")){
										stickyNoteArray[i].visible = true
									}else{
										stickyNoteArray[i].visible = false
									}
								}else{
									stickyNoteArray[i].material.color = new THREE.Color(0xED553B)
									if(checkedEmos.includes("negativea.")){
										stickyNoteArray[i].visible = true
									}else{
										stickyNoteArray[i].visible = false
									}
								}
								
							}else{
								if(interectionObjs[0].object.userData.dept == "Resident"){
									stickyNoteArray[i].material.color = new THREE.Color(0x2271b1)
									if(checkedDepts.includes("Resident")){
										stickyNoteArray[i].visible = true
									}else{
										stickyNoteArray[i].visible = false
									}
								}else if(interectionObjs[0].object.userData.dept == "Family"){
									stickyNoteArray[i].material.color = new THREE.Color(0x646970)
									if(checkedDepts.includes("Family")){
										stickyNoteArray[i].visible = true
									}else{
										stickyNoteArray[i].visible = false
									}
								}else if(interectionObjs[0].object.userData.dept == "Staff"){
									stickyNoteArray[i].material.color = new THREE.Color(0xd63638)
									if(checkedDepts.includes("Staff")){
										stickyNoteArray[i].visible = true
									}else{
										stickyNoteArray[i].visible = false
									}
								}else if(interectionObjs[0].object.userData.dept == "Official"){
									stickyNoteArray[i].material.color = new THREE.Color(0x996b00)
									if(checkedDepts.includes("Official")){
										stickyNoteArray[i].visible = true
									}else{
										stickyNoteArray[i].visible = false
									}
								}else if(interectionObjs[0].object.userData.dept == "Veteran"){
									stickyNoteArray[i].material.color = new THREE.Color(0xF6D55C)
									if(checkedDepts.includes("Veteran")){
										stickyNoteArray[i].visible = true
									}else{
										stickyNoteArray[i].visible = false
									}
								}else{
									stickyNoteArray[i].material.color = new THREE.Color(0x008a20)
									if(checkedDepts.includes("Other")){
										stickyNoteArray[i].visible = true
									}else{
										stickyNoteArray[i].visible = false
									}
								}
								// stickyNoteArray[i].material.color = new THREE.Color(0x20639B)
							}
						}else{
							stickyNoteArray[i].material.opacity = 0.1;
							stickyNoteArray[i].material.color = new THREE.Color(0x000000)
							// console.log(interectionObjs[0])
						}
					}
					
				}
	
			}

			// 0.998, 0.026, -1.188
			// 0.015, 0.026, 2.336
			// 1.052, 0.026, -2.874


			if(currentCameraPosition == 0){
				camera.position.set(-0.998, 0.026, -1.188)

				pano1.position.y = 0;
				pano2.position.y = 10000;
				pano3.position.y = 10000;
			
			
			

			}else if(currentCameraPosition == 1){
				camera.position.set(0.015, 0.026, 2.336)

				pano1.position.y = 10000;
				pano2.position.y = 0;
				pano3.position.y = 10000;

			}else if(currentCameraPosition == 2){
				camera.position.set(1.052, 0.026, -2.874)
				pano1.position.y = 10000;
				pano2.position.y = 10000;
				pano3.position.y = 0;
			
			
			
			

			}
			

			

			// pickHelper.pick(pickPosition, scene, camera);

			// if (currentlyHoveringOverAnObject) {
			// console.log("hovering")

			// if (currentlyHoveringOverAnObject) {

			// console.log(pickableMeshes.length)

			// console.log(currentPoint)

			// console.log(currentPoint)

			pickHelper.pick(pickPosition, scene, camera);


			hoverStickyNote.lookAt(new THREE.Vector3(0, 0, 0))
			hoverStickyNote.position.x = 0
			hoverStickyNote.position.y = 0
			hoverStickyNote.position.z = 0
			// hoverStickyNote.lookAt(objectNormal)
			let myLookAt = new THREE.Vector3(objectNormal.x, objectNormal.y, objectNormal.z)
			hoverStickyNote.lookAt(myLookAt)
			hoverStickyNote.position.x = currentPoint.x
			hoverStickyNote.position.y = currentPoint.y
			hoverStickyNote.position.z = currentPoint.z

			commentsVector.x = clickedObjectNormal.x
			commentsVector.y = clickedObjectNormal.y
			commentsVector.z = clickedObjectNormal.z

			// }
			// else{
			//   hoverStickyNote.setPosition(1000,1000,1000)
			// }

			// console.log("hovering")
			// for (let i = 0; i < pickableMeshes.length; i++) {
			// 	if (pickableMeshes[i].material.opacity != 0.1) {
			// 		pickableMeshes[i].material.opacity = 0.9
			// 	}
			// }
			// time *= 0.001;  // convert to seconds;

			// if (resizeRendererToDisplaySize(renderer)) {
			// 	const canvas = renderer.domElement;
			// 	camera.aspect = canvas.clientWidth / canvas.clientHeight;
			// 	camera.updateProjectionMatrix();
			// }
			// } else {
			// 	// console.log("not hovering")
			// 	for (let i = 0; i < pickableMeshes.length; i++) {
			// 		if (pickableMeshes[i].material.opacity != 0.1) {
			// 			pickableMeshes[i].material.opacity = 1
			// 		}
			// 	}
			// }





			if (isUserInteracting === false && rotateCamera) {

				lon += 0.1;

			}

			lat = Math.max(- 85, Math.min(85, lat));
			phi = THREE.MathUtils.degToRad(90 - lat);
			theta = THREE.MathUtils.degToRad(lon);

			const x = 500 * Math.sin(phi) * Math.cos(theta);
			const y = 500 * Math.cos(phi);
			const z = 500 * Math.sin(phi) * Math.sin(theta);

			camera.lookAt(x, y, z);

			// console.log(x)

			// renderer.render(scene, camera);
			composer.render()
			// labelRenderer.render(scene, camera);
			// clearPickPosition()

		}

		// clearPickPosition();

		function getCanvasRelativePosition(event) {
			const rect = container.getBoundingClientRect();
			return {
				x: event.clientX - rect.left,
				y: event.clientY - rect.top,
			};
		}

		function setPickPosition(event) {
			const pos = getCanvasRelativePosition(event);
			pickPosition.x = (pos.x / container.clientWidth) * 2 - 1;
			pickPosition.y = (pos.y / container.clientHeight) * -2 + 1;  // note we flip Y
			// console.log(pickPosition.x, pickPosition.y)
			// if (pickPosition.y < -1) {
			//   pickPosition.y = -100000
			//   mouseInCanvas = false;
			//   // currentlyHoveringOverAnObject = false
			// }else{
			//   mouseInCanvas = true
			// }
		}

		function clearPickPosition() {
			// unlike the mouse which always has a position
			// if the user stops touching the screen we want
			// to stop picking. For now we just pick a value
			// unlikely to pick something
			pickPosition.x = -100000;
			pickPosition.y = -100000;
			doClickOnRelease = false;
		}

		// window.addEventListener('mouseout', clearPickPosition);
		// window.addEventListener('mouseleave', clearPickPosition);
		// document.addEventListener( 'mousedown', onDocumentMouseDown, false );
		window.addEventListener('dblclick', onDocumentMouseDown, false);
		window.addEventListener('click', onDocumentMouseClick, false);


		// window.addEventListener('touchstart', (event) => {
		//   // prevent the window from scrolling
		//   event.preventDefault();
		//   setPickPosition(event.touches[0]);
		// }, { passive: false });

		// window.addEventListener('touchmove', (event) => {
		//   doClickOnRelease = false;
		//   setPickPosition(event.touches[0]);
		// });

		// window.addEventListener('touchend', clearPickPosition);

		window.addEventListener('mousemove', (event) => {
			
			// console.log("moved")
			// doClickOnRelease = false;
			setPickPosition(event)

			// console.log(pickPosition)
			// cursor.x = event.clientX / sizes.width - 0.5
			// cursor.y = - (event.clientY / sizes.height - 0.5)

			// pickHelper.pick(pickPosition, scene, camera);

			// console.log(cursor)
		})

		function onDocumentMouseClick(event) {
			// doClickOnRelease = true;
			// clickedObjectNormal = objectNormal;

			// if(hasEnteredScene){
			// 	rotateCamera = false;
			// 	console.log("hello")
			// }

			if(currentlyHoveringOverCircle){
				currentCameraPosition = currentCircle;
				hoverStickyNote.material.opacity = 0.0
			}else{
				hoverStickyNote.material.opacity = 1.0
// if (currentlyHoveringOverAnObject && doClickOnRelease) {
			// console.log("click")


		}
	}

		function onDocumentMouseDown(event) {
			doClickOnRelease = true;
			clickedObjectNormal = objectNormal;

			if(hasEnteredScene){
				rotateCamera = false;
				console.log("hello")
			}

			if(currentlyHoveringOverCircle){
				currentCameraPosition = currentCircle;
				hoverStickyNote.material.opacity = 0.0
			}else{
				hoverStickyNote.material.opacity = 1.0
// if (currentlyHoveringOverAnObject && doClickOnRelease) {
			// console.log("click")


			event.preventDefault();

			const cube = new THREE.Mesh(
				new THREE.CubeGeometry(0.1, 0.1, 0.01),
				new THREE.MeshBasicMaterial({ color: 0x173F5F }),
			);

			if (!nameOfObject.startsWith('comment')) {
				console.log(objectNormal)
				cubeNumber++
				let myLookAt = new THREE.Vector3(clickedObjectNormal.x, clickedObjectNormal.y, clickedObjectNormal.z)
				cube.lookAt(myLookAt)
				cube.position.x = currentPoint.x
				cube.position.y = currentPoint.y
				cube.position.z = currentPoint.z


				commentPosition.x = currentPoint.x
				commentPosition.y = currentPoint.y
				commentPosition.z = currentPoint.z

				elementName = nameOfObject

				cube.name = "comment" + cubeNumber
				// console.log(currentPoint)
				// console.log("success")
				// console.log("the name of this object is: " + nameOfObject)
				listOfClickedObjects.push(nameOfObject)
				location.hash = 'modal';
				document.getElementById("putObjectNameHere").innerHTML = nameOfObject
				console.log(nameOfObject)

				// pickableMeshes.push(cube)
				commentBalls.push(cube)

				scene.add(cube)
			} else {
				// console.log("you wrote this here")
			}
			}


		}

		