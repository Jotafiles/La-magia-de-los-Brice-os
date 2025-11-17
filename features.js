// ============================================
// NUEVAS FUNCIONALIDADES - LA MAGIA DE LOS BRICEÑOS
// Galería de Fotos, Votaciones, Mensaje Admin, Árbol Mejorado
// ============================================

// ============================================
// GALERÍA DE FOTOS NAVIDEÑAS
// ============================================

async function uploadPhoto() {
    try {
        const fileInput = document.getElementById('photoFile');
        const caption = document.getElementById('photoCaption').value;
        
        if (!fileInput.files || !fileInput.files[0]) {
            showToast('❌ Por favor selecciona una foto');
            return;
        }
        
        const file = fileInput.files[0];
        
        // Validar tamaño (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast('❌ La foto es muy grande (máximo 5MB)');
            return;
        }
        
        showToast('📤 Subiendo foto...');
        
        // Generar nombre único
        const fileExt = file.name.split('.').pop();
        const fileName = `${AppState.currentUser.id}_${Date.now()}.${fileExt}`;
        
        // Subir a Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('photos')
            .upload(fileName, file);
        
        if (uploadError) throw uploadError;
        
        // Obtener URL pública
        const { data: urlData } = supabase.storage
            .from('photos')
            .getPublicUrl(fileName);
        
        // Guardar en base de datos
        const { data, error } = await supabase
            .from('photos')
            .insert([{
                url: urlData.publicUrl,
                user_id: AppState.currentUser.id,
                caption: caption || '',
                category: 'navideña',
                approved: true,
                flagged: false
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        showToast('✅ ¡Foto subida con éxito! 📸');
        
        // Limpiar formulario
        fileInput.value = '';
        document.getElementById('photoCaption').value = '';
        
        // Recargar galería
        await loadPhotos();
        
        // Notificación
        await createNotification('success', 'Nueva Foto', `${AppState.currentUser.name} subió una foto navideña`, '📸');
        
    } catch (error) {
        console.error('Error al subir foto:', error);
        showToast('❌ Error al subir la foto');
    }
}

async function loadPhotos() {
    try {
        const photosGrid = document.getElementById('photosGrid');
        
        // Mostrar loading
        photosGrid.innerHTML = `
            <div class="loading-participants">
                <div class="spinning-gift">📸</div>
                <p>Cargando fotos...</p>
            </div>
        `;
        
        // Cargar fotos con información del usuario
        const { data: photos, error } = await supabase
            .from('photos')
            .select(`
                *,
                user:users(name, avatar)
            `)
            .eq('approved', true)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (!photos || photos.length === 0) {
            photosGrid.innerHTML = `
                <div class="empty-notifications">
                    <div class="empty-icon">📸</div>
                    <p>No hay fotos aún</p>
                    <span>Sé el primero en compartir una foto navideña</span>
                </div>
            `;
            return;
        }
        
        // Cargar likes para cada foto
        const { data: allLikes, error: likesError } = await supabase
            .from('photo_likes')
            .select('photo_id, user_id');
        
        // Crear mapa de likes
        const likesMap = {};
        if (allLikes) {
            allLikes.forEach(like => {
                if (!likesMap[like.photo_id]) {
                    likesMap[like.photo_id] = [];
                }
                likesMap[like.photo_id].push(like.user_id);
            });
        }
        
        // Renderizar fotos
        photosGrid.innerHTML = photos.map(photo => {
            const likes = likesMap[photo.id] || [];
            const likeCount = likes.length;
            const userLiked = likes.includes(AppState.currentUser.id);
            const date = new Date(photo.created_at).toLocaleDateString('es-CL');
            
            return `
                <div class="photo-card" data-photo-id="${photo.id}">
                    <div class="photo-header">
                        <div class="photo-user">
                            <span class="photo-avatar">${photo.user?.avatar || '🎅'}</span>
                            <div>
                                <span class="photo-username">${photo.user?.name || 'Usuario'}</span>
                                <span class="photo-date">${date}</span>
                            </div>
                        </div>
                        ${AppState.isAdmin ? `
                            <button class="btn-delete-photo" data-photo-id="${photo.id}" title="Eliminar foto">
                                🗑️
                            </button>
                        ` : ''}
                    </div>
                    <img src="${photo.url}" alt="${photo.caption}" class="photo-image" loading="lazy">
                    ${photo.caption ? `<p class="photo-caption">${photo.caption}</p>` : ''}
                    <div class="photo-actions">
                        <button class="btn-like ${userLiked ? 'liked' : ''}" data-photo-id="${photo.id}">
                            <span class="like-icon">${userLiked ? '❤️' : '🤍'}</span>
                            <span class="like-count">${likeCount}</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Event listeners para likes
        document.querySelectorAll('.btn-like').forEach(btn => {
            btn.addEventListener('click', () => {
                const photoId = btn.dataset.photoId;
                toggleLike(photoId);
            });
        });
        
        // Event listeners para eliminar fotos (admin)
        document.querySelectorAll('.btn-delete-photo').forEach(btn => {
            btn.addEventListener('click', () => {
                const photoId = btn.dataset.photoId;
                deletePhoto(photoId);
            });
        });
        
    } catch (error) {
        console.error('Error al cargar fotos:', error);
        showToast('❌ Error al cargar fotos');
    }
}

async function toggleLike(photoId) {
    try {
        // Verificar si ya dio like
        const { data: existingLike, error: checkError } = await supabase
            .from('photo_likes')
            .select('id')
            .eq('photo_id', photoId)
            .eq('user_id', AppState.currentUser.id)
            .single();
        
        if (existingLike) {
            // Quitar like
            const { error } = await supabase
                .from('photo_likes')
                .delete()
                .eq('photo_id', photoId)
                .eq('user_id', AppState.currentUser.id);
            
            if (error) throw error;
        } else {
            // Dar like
            const { error } = await supabase
                .from('photo_likes')
                .insert([{
                    photo_id: photoId,
                    user_id: AppState.currentUser.id
                }]);
            
            if (error) throw error;
        }
        
        // Recargar fotos
        await loadPhotos();
        
    } catch (error) {
        console.error('Error al dar like:', error);
        showToast('❌ Error al dar like');
    }
}

async function deletePhoto(photoId) {
    if (!AppState.isAdmin) {
        showToast('❌ Solo el administrador puede eliminar fotos');
        return;
    }
    
    if (!confirm('¿Eliminar esta foto?')) {
        return;
    }
    
    try {
        // Obtener URL de la foto para eliminar del storage
        const { data: photo, error: fetchError } = await supabase
            .from('photos')
            .select('url')
            .eq('id', photoId)
            .single();
        
        if (fetchError) throw fetchError;
        
        // Extraer nombre del archivo de la URL
        const fileName = photo.url.split('/').pop();
        
        // Eliminar del storage
        await supabase.storage
            .from('photos')
            .remove([fileName]);
        
        // Eliminar de la base de datos
        const { error } = await supabase
            .from('photos')
            .delete()
            .eq('id', photoId);
        
        if (error) throw error;
        
        showToast('✅ Foto eliminada');
        await loadPhotos();
        
    } catch (error) {
        console.error('Error al eliminar foto:', error);
        showToast('❌ Error al eliminar foto');
    }
}

async function deleteAllPhotos() {
    if (!AppState.isAdmin) {
        showToast('❌ Solo el administrador puede eliminar todas las fotos');
        return;
    }
    
    if (!confirm('¿Eliminar TODAS las fotos? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        showToast('🗑️ Eliminando fotos...');
        
        // Obtener todas las fotos
        const { data: photos, error: fetchError } = await supabase
            .from('photos')
            .select('url');
        
        if (fetchError) throw fetchError;
        
        // Eliminar del storage
        if (photos && photos.length > 0) {
            const fileNames = photos.map(photo => photo.url.split('/').pop());
            await supabase.storage
                .from('photos')
                .remove(fileNames);
        }
        
        // Eliminar de la base de datos
        const { error } = await supabase
            .from('photos')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Eliminar todas
        
        if (error) throw error;
        
        showToast('✅ Todas las fotos eliminadas');
        await loadPhotos();
        
    } catch (error) {
        console.error('Error al eliminar fotos:', error);
        showToast('❌ Error al eliminar fotos');
    }
}

// ============================================
// VOTACIONES FAMILIARES
// ============================================

async function createPoll() {
    if (!AppState.isAdmin) {
        showToast('❌ Solo el administrador puede crear encuestas');
        return;
    }
    
    try {
        const title = document.getElementById('pollTitle').value;
        const description = document.getElementById('pollDescription').value;
        const optionsText = document.getElementById('pollOptions').value;
        const deadline = document.getElementById('pollDeadline').value;
        const multipleChoice = document.getElementById('pollMultipleChoice').checked;
        
        if (!title || !optionsText) {
            showToast('❌ Título y opciones son requeridos');
            return;
        }
        
        // Parsear opciones
        const optionLines = optionsText.split('\n').filter(line => line.trim());
        if (optionLines.length < 2) {
            showToast('❌ Debes agregar al menos 2 opciones');
            return;
        }
        
        const options = optionLines.map((text, index) => ({
            id: `opt_${index}`,
            text: text.trim(),
            votes: 0
        }));
        
        showToast('📝 Creando encuesta...');
        
        // Crear encuesta
        const { data, error } = await supabase
            .from('polls')
            .insert([{
                title,
                description,
                options: JSON.stringify(options),
                deadline: deadline || null,
                multiple_choice: multipleChoice,
                is_closed: false,
                created_by: AppState.currentUser.id
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        showToast('✅ ¡Encuesta creada!');
        
        // Limpiar formulario
        document.getElementById('pollTitle').value = '';
        document.getElementById('pollDescription').value = '';
        document.getElementById('pollOptions').value = '';
        document.getElementById('pollDeadline').value = '';
        document.getElementById('pollMultipleChoice').checked = false;
        
        // Recargar encuestas
        await loadPolls();
        
        // Notificación
        await createNotification('info', 'Nueva Encuesta', `${title}`, '🗳️');
        
    } catch (error) {
        console.error('Error al crear encuesta:', error);
        showToast('❌ Error al crear encuesta');
    }
}

async function loadPolls() {
    try {
        const pollsList = document.getElementById('pollsList');
        
        // Mostrar loading
        pollsList.innerHTML = `
            <div class="loading-participants">
                <div class="spinning-gift">🗳️</div>
                <p>Cargando encuestas...</p>
            </div>
        `;
        
        // Cargar encuestas
        const { data: polls, error } = await supabase
            .from('polls')
            .select(`
                *,
                creator:users!created_by(name)
            `)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (!polls || polls.length === 0) {
            pollsList.innerHTML = `
                <div class="empty-notifications">
                    <div class="empty-icon">🗳️</div>
                    <p>No hay encuestas aún</p>
                    <span>El administrador puede crear encuestas</span>
                </div>
            `;
            return;
        }
        
        // Cargar votos del usuario
        const { data: userVotes, error: votesError } = await supabase
            .from('poll_votes')
            .select('poll_id, option_ids')
            .eq('user_id', AppState.currentUser.id);
        
        const userVotesMap = {};
        if (userVotes) {
            userVotes.forEach(vote => {
                userVotesMap[vote.poll_id] = JSON.parse(vote.option_ids);
            });
        }
        
        // Renderizar encuestas
        pollsList.innerHTML = polls.map(poll => {
            const options = JSON.parse(poll.options);
            const userVoted = userVotesMap[poll.id];
            const deadline = poll.deadline ? new Date(poll.deadline) : null;
            const isExpired = deadline && deadline < new Date();
            const isClosed = poll.is_closed || isExpired;
            
            // Calcular total de votos
            const totalVotes = options.reduce((sum, opt) => sum + opt.votes, 0);
            
            return `
                <div class="poll-card ${isClosed ? 'poll-closed' : ''}">
                    <div class="poll-header">
                        <h3>${poll.title}</h3>
                        ${isClosed ? '<span class="poll-badge-closed">Cerrada</span>' : ''}
                        ${userVoted ? '<span class="poll-badge-voted">Votaste</span>' : ''}
                    </div>
                    ${poll.description ? `<p class="poll-description">${poll.description}</p>` : ''}
                    ${deadline ? `<p class="poll-deadline">📅 Hasta: ${deadline.toLocaleString('es-CL')}</p>` : ''}
                    
                    <div class="poll-options">
                        ${options.map(option => {
                            const percentage = totalVotes > 0 ? (option.votes / totalVotes * 100).toFixed(1) : 0;
                            const isSelected = userVoted && userVoted.includes(option.id);
                            
                            return `
                                <div class="poll-option ${isSelected ? 'selected' : ''}" data-poll-id="${poll.id}" data-option-id="${option.id}">
                                    <div class="poll-option-bar" style="width: ${percentage}%"></div>
                                    <div class="poll-option-content">
                                        <span class="poll-option-text">${option.text}</span>
                                        <span class="poll-option-votes">${option.votes} (${percentage}%)</span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    
                    <div class="poll-footer">
                        <span class="poll-total">Total: ${totalVotes} votos</span>
                        ${AppState.isAdmin && !isClosed ? `
                            <button class="btn-close-poll" data-poll-id="${poll.id}">
                                🔒 Cerrar
                            </button>
                        ` : ''}
                        ${AppState.isAdmin ? `
                            <button class="btn-delete-poll" data-poll-id="${poll.id}">
                                🗑️
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        // Event listeners para votar
        document.querySelectorAll('.poll-option').forEach(option => {
            option.addEventListener('click', () => {
                const pollId = option.dataset.pollId;
                const optionId = option.dataset.optionId;
                const poll = polls.find(p => p.id === pollId);
                
                if (!poll.is_closed && !(poll.deadline && new Date(poll.deadline) < new Date())) {
                    votePoll(pollId, optionId, poll.multiple_choice);
                }
            });
        });
        
        // Event listeners para cerrar encuesta (admin)
        document.querySelectorAll('.btn-close-poll').forEach(btn => {
            btn.addEventListener('click', () => {
                const pollId = btn.dataset.pollId;
                closePoll(pollId);
            });
        });
        
        // Event listeners para eliminar encuesta (admin)
        document.querySelectorAll('.btn-delete-poll').forEach(btn => {
            btn.addEventListener('click', () => {
                const pollId = btn.dataset.pollId;
                deletePoll(pollId);
            });
        });
        
    } catch (error) {
        console.error('Error al cargar encuestas:', error);
        showToast('❌ Error al cargar encuestas');
    }
}

async function votePoll(pollId, optionId, multipleChoice) {
    try {
        // Verificar si ya votó
        const { data: existingVote, error: checkError } = await supabase
            .from('poll_votes')
            .select('id, option_ids')
            .eq('poll_id', pollId)
            .eq('user_id', AppState.currentUser.id)
            .single();
        
        let optionIds = [optionId];
        let previousIds = [];
        
        if (existingVote) {
            previousIds = JSON.parse(existingVote.option_ids);
            
            if (!multipleChoice) {
                // Si no es múltiple, cambiar voto
                if (previousIds.includes(optionId)) {
                    showToast('⚠️ Ya votaste por esta opción');
                    return;
                }
                // Decrementar voto anterior
                for (const prevId of previousIds) {
                    await decrementPollOption(pollId, prevId);
                }
                optionIds = [optionId];
            } else {
                // Agregar o quitar opción
                if (previousIds.includes(optionId)) {
                    optionIds = previousIds.filter(id => id !== optionId);
                    await decrementPollOption(pollId, optionId);
                    
                    if (optionIds.length === 0) {
                        // Eliminar voto si no hay opciones seleccionadas
                        await supabase
                            .from('poll_votes')
                            .delete()
                            .eq('id', existingVote.id);
                        
                        await loadPolls();
                        return;
                    }
                } else {
                    optionIds = [...previousIds, optionId];
                    await incrementPollOption(pollId, optionId);
                }
            }
            
            // Actualizar voto
            await supabase
                .from('poll_votes')
                .update({ option_ids: JSON.stringify(optionIds) })
                .eq('id', existingVote.id);
        } else {
            // Crear nuevo voto
            await supabase
                .from('poll_votes')
                .insert([{
                    poll_id: pollId,
                    user_id: AppState.currentUser.id,
                    option_ids: JSON.stringify(optionIds)
                }]);
            
            await incrementPollOption(pollId, optionId);
        }
        
        showToast('✅ ¡Voto registrado!');
        await loadPolls();
        
    } catch (error) {
        console.error('Error al votar:', error);
        showToast('❌ Error al votar');
    }
}

async function incrementPollOption(pollId, optionId) {
    try {
        const { data: poll, error: fetchError } = await supabase
            .from('polls')
            .select('options')
            .eq('id', pollId)
            .single();
        
        if (fetchError) throw fetchError;
        
        const options = JSON.parse(poll.options);
        const option = options.find(opt => opt.id === optionId);
        if (option) {
            option.votes++;
        }
        
        await supabase
            .from('polls')
            .update({ options: JSON.stringify(options) })
            .eq('id', pollId);
        
    } catch (error) {
        console.error('Error al incrementar voto:', error);
    }
}

async function decrementPollOption(pollId, optionId) {
    try {
        const { data: poll, error: fetchError } = await supabase
            .from('polls')
            .select('options')
            .eq('id', pollId)
            .single();
        
        if (fetchError) throw fetchError;
        
        const options = JSON.parse(poll.options);
        const option = options.find(opt => opt.id === optionId);
        if (option && option.votes > 0) {
            option.votes--;
        }
        
        await supabase
            .from('polls')
            .update({ options: JSON.stringify(options) })
            .eq('id', pollId);
        
    } catch (error) {
        console.error('Error al decrementar voto:', error);
    }
}

async function closePoll(pollId) {
    if (!AppState.isAdmin) {
        showToast('❌ Solo el administrador puede cerrar encuestas');
        return;
    }
    
    if (!confirm('¿Cerrar esta encuesta?')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('polls')
            .update({ is_closed: true })
            .eq('id', pollId);
        
        if (error) throw error;
        
        showToast('✅ Encuesta cerrada');
        await loadPolls();
        
    } catch (error) {
        console.error('Error al cerrar encuesta:', error);
        showToast('❌ Error al cerrar encuesta');
    }
}

async function deletePoll(pollId) {
    if (!AppState.isAdmin) {
        showToast('❌ Solo el administrador puede eliminar encuestas');
        return;
    }
    
    if (!confirm('¿Eliminar esta encuesta?')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('polls')
            .delete()
            .eq('id', pollId);
        
        if (error) throw error;
        
        showToast('✅ Encuesta eliminada');
        await loadPolls();
        
    } catch (error) {
        console.error('Error al eliminar encuesta:', error);
        showToast('❌ Error al eliminar encuesta');
    }
}

// ============================================
// MENSAJE ESPECIAL DEL ADMINISTRADOR
// ============================================

async function loadAdminMessage() {
    try {
        const { data, error } = await supabase
            .from('admin_message')
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
            // Obtener nombre del autor por separado
            let authorName = 'Administrador';
            if (data.author_id) {
                const { data: author } = await supabase
                    .from('users')
                    .select('name')
                    .eq('id', data.author_id)
                    .single();
                
                if (author) {
                    authorName = author.name;
                }
            }
            
            // Mostrar en home screen
            const messageCard = document.getElementById('adminMessageCard');
            const messageText = document.getElementById('adminMessageText');
            const messageAuthor = document.getElementById('adminMessageAuthor');
            
            if (messageCard && messageText && messageAuthor) {
                messageText.textContent = data.message;
                messageAuthor.textContent = authorName;
                messageCard.classList.remove('hidden');
            }
            
            // Cargar en textarea del admin
            if (AppState.isAdmin) {
                const input = document.getElementById('adminMessageInput');
                if (input) {
                    input.value = data.message;
                }
            }
        } else {
            // Ocultar si no hay mensaje
            const messageCard = document.getElementById('adminMessageCard');
            if (messageCard) {
                messageCard.classList.add('hidden');
            }
        }
        
    } catch (error) {
        console.error('Error al cargar mensaje del admin:', error);
    }
}

async function saveAdminMessage() {
    if (!AppState.isAdmin) {
        showToast('❌ Solo el administrador puede guardar mensajes');
        return;
    }
    
    try {
        const message = document.getElementById('adminMessageInput').value;
        
        if (!message.trim()) {
            showToast('❌ El mensaje no puede estar vacío');
            return;
        }
        
        showToast('💾 Guardando mensaje...');
        
        // Verificar si ya existe un mensaje
        const { data: existing, error: fetchError } = await supabase
            .from('admin_message')
            .select('id')
            .limit(1)
            .single();
        
        if (existing) {
            // Actualizar mensaje existente
            const { error } = await supabase
                .from('admin_message')
                .update({
                    message,
                    author_id: AppState.currentUser.id,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id);
            
            if (error) throw error;
        } else {
            // Crear nuevo mensaje
            const { error } = await supabase
                .from('admin_message')
                .insert([{
                    message,
                    author_id: AppState.currentUser.id
                }]);
            
            if (error) throw error;
        }
        
        showToast('✅ ¡Mensaje guardado!');
        await loadAdminMessage();
        
        // Notificación
        await createNotification('info', 'Mensaje Especial', 'El administrador publicó un mensaje', '📢');
        
    } catch (error) {
        console.error('Error al guardar mensaje:', error);
        showToast('❌ Error al guardar mensaje');
    }
}

async function deleteAdminMessage() {
    if (!AppState.isAdmin) {
        showToast('❌ Solo el administrador puede eliminar mensajes');
        return;
    }
    
    if (!confirm('¿Eliminar el mensaje especial?')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('admin_message')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Eliminar todos
        
        if (error) throw error;
        
        showToast('✅ Mensaje eliminado');
        document.getElementById('adminMessageInput').value = '';
        
        const messageCard = document.getElementById('adminMessageCard');
        if (messageCard) {
            messageCard.classList.add('hidden');
        }
        
    } catch (error) {
        console.error('Error al eliminar mensaje:', error);
        showToast('❌ Error al eliminar mensaje');
    }
}

console.log('✅ Features.js cargado - Galería, Votaciones y Mensaje Admin');
