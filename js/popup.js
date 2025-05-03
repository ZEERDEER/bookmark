// 预先定义DOM渲染完成的标志
let domContentLoaded = false;

// 确保DOM完全加载后再执行
document.addEventListener('DOMContentLoaded', function() {
  domContentLoaded = true;
  loadBookmarks();
  
  // 为文档添加点击事件监听，处理波纹效果
  document.addEventListener('click', createRippleEffect);
  
  // 添加一个全局点击事件委托处理器
  document.getElementById('bookmarkContainer').addEventListener('click', handleFolderClicks);
});

// 如果DOM已经加载完成，则直接执行
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  domContentLoaded = true;
  setTimeout(loadBookmarks, 0);
  
  // 为文档添加点击事件监听，处理波纹效果
  document.addEventListener('click', createRippleEffect);
}

// 全局委托处理文件夹点击事件，提高性能
function handleFolderClicks(e) {
  // 找到最近的文件夹头部元素
  const folderHeader = e.target.closest('.folder-header');
  if (!folderHeader) return; // 如果点击的不是文件夹头部或其内部元素，则退出
  
  e.stopPropagation(); // 阻止事件冒泡
  
  const folder = folderHeader.parentNode;
  const isExpanding = !folder.classList.contains('expanded');
  
  if (isExpanding) {
    // 展开文件夹
    folder.classList.add('expanded');
  } else {
    // 折叠文件夹
    folder.classList.remove('expanded');
    
    // 递归折叠所有子文件夹
    const subFolders = folder.querySelectorAll('.bookmark-folder');
    subFolders.forEach(function(subFolder) {
      subFolder.classList.remove('expanded');
    });
  }
}

// 创建波纹效果函数
function createRippleEffect(event) {
  const target = event.target;
  
  // 检查点击元素是否有ripple类或其父元素有ripple类
  const rippleElement = target.closest('.ripple');
  
  // 如果没有可应用波纹的元素，直接返回
  if (!rippleElement) return;
  
  // 创建波纹元素
  const ripple = document.createElement('span');
  ripple.className = 'ripple-effect';
  rippleElement.appendChild(ripple);
  
  // 计算波纹的尺寸（取元素的最大尺寸）
  const size = Math.max(rippleElement.clientWidth, rippleElement.clientHeight);
  
  // 设置波纹元素的尺寸
  ripple.style.width = ripple.style.height = `${size}px`;
  
  // 计算波纹的位置（相对于被点击元素）
  const rect = rippleElement.getBoundingClientRect();
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;
  
  // 设置波纹元素的位置
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  
  // 动画完成后移除波纹元素
  setTimeout(() => {
    ripple.remove();
  }, 300); // 降低波纹效果持续时间，加快响应
}

// 加载书签的主函数
function loadBookmarks() {
  if (!domContentLoaded) return;
  
  // 清除加载占位符
  const container = document.getElementById('bookmarkContainer');
  container.innerHTML = '';
  
  // 获取书签树
  chrome.bookmarks.getTree(function(bookmarkTreeNodes) {
    // 渲染书签树
    renderBookmarks(bookmarkTreeNodes[0].children, container);

    // 初始化时立即展开顶级文件夹
    document.querySelectorAll('#bookmarkContainer > .bookmark-folder').forEach(function(folder) {
      folder.classList.add('expanded');
    });

    // 初始化时确保所有子文件夹是关闭的
    document.querySelectorAll('.folder-content .bookmark-folder').forEach(function(folder) {
      folder.classList.remove('expanded');
    });
    
    // 为所有元素添加视觉反馈相关的类
    document.querySelectorAll('.folder-header, .bookmark-item').forEach(function(element) {
      element.classList.add('ripple');
    });
    
    // 添加右键菜单事件
    setupContextMenus();
  });
}

// 设置右键菜单
function setupContextMenus() {
  // 为书签项添加右键菜单
  document.querySelectorAll('.bookmark-item').forEach(function(bookmark) {
    bookmark.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      
      // 获取书签ID
      const bookmarkId = this.dataset.id;
      if (!bookmarkId) return;
      
      // 创建右键菜单
      showContextMenu(e, [
        {
          text: '编辑书签',
          icon: '✏️',
          action: function() {
            // 使用自定义对话框编辑书签
            useBookmarkManagerPrivate(bookmarkId);
          }
        },
        {
          text: '删除书签',
          icon: '🗑️',
          action: function() {
            // 使用自定义对话框确认删除
            showDeleteConfirmDialog(bookmarkId, false, bookmark);
          }
        }
      ]);
    });
  });
  
  // 为文件夹添加右键菜单
  document.querySelectorAll('.folder-header').forEach(function(folderHeader) {
    folderHeader.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      
      // 获取文件夹ID
      const folder = this.parentNode;
      const folderId = folder.dataset.id;
      if (!folderId) return;
      
      // 创建右键菜单
      showContextMenu(e, [
        {
          text: '编辑文件夹',
          icon: '✏️',
          action: function() {
            // 使用自定义对话框编辑文件夹
            useBookmarkManagerPrivate(folderId);
          }
        },
        {
          text: '删除文件夹',
          icon: '🗑️',
          action: function() {
            // 使用自定义对话框确认删除
            showDeleteConfirmDialog(folderId, true, folder);
          }
        }
      ]);
    });
  });
  
  // 点击其他地方隐藏菜单
  document.addEventListener('click', function() {
    hideContextMenu();
  });
}

// 显示右键菜单
function showContextMenu(event, menuItems) {
  // 隐藏任何现有菜单
  hideContextMenu();
  
  // 创建菜单容器
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.top = `${event.clientY}px`;
  menu.style.left = `${event.clientX}px`;
  
  // 添加菜单项
  menuItems.forEach(function(item) {
    const menuItem = document.createElement('div');
    menuItem.className = 'context-menu-item';
    
    if (item.icon) {
      const icon = document.createElement('span');
      icon.className = 'context-menu-icon';
      icon.textContent = item.icon;
      menuItem.appendChild(icon);
    }
    
    const text = document.createElement('span');
    text.className = 'context-menu-text';
    text.textContent = item.text;
    menuItem.appendChild(text);
    
    menuItem.addEventListener('click', function(e) {
      e.stopPropagation();
      hideContextMenu();
      item.action();
    });
    
    menu.appendChild(menuItem);
  });
  
  // 添加到DOM
  document.body.appendChild(menu);
  
  // 调整位置，确保不超出视口
  const menuRect = menu.getBoundingClientRect();
  if (menuRect.right > window.innerWidth) {
    menu.style.left = `${window.innerWidth - menuRect.width - 5}px`;
  }
  if (menuRect.bottom > window.innerHeight) {
    menu.style.top = `${window.innerHeight - menuRect.height - 5}px`;
  }
}

// 隐藏右键菜单
function hideContextMenu() {
  const menu = document.querySelector('.context-menu');
  if (menu) {
    menu.remove();
  }
}

// 渲染书签树
function renderBookmarks(bookmarkNodes, container) {
  if (!bookmarkNodes || !bookmarkNodes.length) return;

  // 创建收藏夹文件夹
  const favoritesFolder = document.createElement('div');
  favoritesFolder.className = 'bookmark-folder ripple';
  
  const favoritesFolderHeader = document.createElement('div');
  favoritesFolderHeader.className = 'folder-header';
  
  const favoritesFolderExpandIcon = document.createElement('span');
  favoritesFolderExpandIcon.className = 'expand-icon';
  
  const favoritesFolderIcon = document.createElement('span');
  favoritesFolderIcon.className = 'folder-icon-small';
  
  const favoritesFolderName = document.createElement('span');
  favoritesFolderName.className = 'folder-name';
  favoritesFolderName.textContent = '收藏夹栏';
  
  // 保持一致的顺序：先展开图标，再文件夹图标，再文件夹名称
  favoritesFolderHeader.appendChild(favoritesFolderExpandIcon);  
  favoritesFolderHeader.appendChild(favoritesFolderIcon);
  favoritesFolderHeader.appendChild(favoritesFolderName);
  
  const favoritesFolderContent = document.createElement('div');
  favoritesFolderContent.className = 'folder-content';
  
  favoritesFolder.appendChild(favoritesFolderHeader);
  favoritesFolder.appendChild(favoritesFolderContent);
  
  container.appendChild(favoritesFolder);
  
  // 创建其他收藏夹文件夹
  const otherFolder = document.createElement('div');
  otherFolder.className = 'bookmark-folder ripple';
  
  const otherFolderHeader = document.createElement('div');
  otherFolderHeader.className = 'folder-header';
  
  const otherFolderExpandIcon = document.createElement('span');
  otherFolderExpandIcon.className = 'expand-icon';
  
  const otherFolderIcon = document.createElement('span');
  otherFolderIcon.className = 'folder-icon-small';
  
  const otherFolderName = document.createElement('span');
  otherFolderName.className = 'folder-name';
  otherFolderName.textContent = '其他收藏夹';
  
  // 保持一致的顺序：先展开图标，再文件夹图标，再文件夹名称
  otherFolderHeader.appendChild(otherFolderExpandIcon);
  otherFolderHeader.appendChild(otherFolderIcon);
  otherFolderHeader.appendChild(otherFolderName);
  
  const otherFolderContent = document.createElement('div');
  otherFolderContent.className = 'folder-content';
  
  otherFolder.appendChild(otherFolderHeader);
  otherFolder.appendChild(otherFolderContent);
  
  container.appendChild(otherFolder);

  // 处理书签栏和其他书签
  bookmarkNodes.forEach(function(node) {
    // 适配不同语言版本的Chrome，支持多种可能的书签栏名称
    if (node.title === "书签栏" || node.title === "Bookmarks bar" || node.title === "书签栏" || node.id === "1") {
      // 存储书签ID
      favoritesFolder.dataset.id = node.id;
      renderBookmarkItems(node.children, favoritesFolderContent);
    } 
    // 适配不同语言版本的Chrome，支持多种可能的其他书签名称
    else if (node.title === "其他书签" || node.title === "Other bookmarks" || node.title === "其他书签" || node.id === "2") {
      // 存储书签ID
      otherFolder.dataset.id = node.id;
      renderBookmarkItems(node.children, otherFolderContent);
    }
  });
  
  // 初始化时确保顶级文件夹是展开的
  document.querySelectorAll('#bookmarkContainer > .bookmark-folder').forEach(function(folder) {
    folder.classList.add('expanded');
  });
}

// 渲染书签项
function renderBookmarkItems(bookmarkNodes, container) {
  if (!bookmarkNodes || !bookmarkNodes.length) return;

  bookmarkNodes.forEach(function(node) {
    if (node.children) {
      // 这是一个文件夹
      const folder = document.createElement('div');
      folder.className = 'bookmark-folder ripple';
      // 存储书签ID
      folder.dataset.id = node.id;

      const folderHeader = document.createElement('div');
      folderHeader.className = 'folder-header';

      const folderIcon = document.createElement('span');
      folderIcon.className = 'folder-icon-small';

      const folderName = document.createElement('span');
      folderName.className = 'folder-name';
      folderName.textContent = node.title || '未命名文件夹'; // Handle untitled folders

      const expandIcon = document.createElement('span');
      expandIcon.className = 'expand-icon';

      folderHeader.appendChild(expandIcon);
      folderHeader.appendChild(folderIcon);
      folderHeader.appendChild(folderName);

      const folderContent = document.createElement('div');
      folderContent.className = 'folder-content';

      folder.appendChild(folderHeader);
      folder.appendChild(folderContent);

      container.appendChild(folder);

      // 递归渲染子项
      renderBookmarkItems(node.children, folderContent);

      // 重要：不要在这里添加点击事件，事件逻辑统一由attachFolderClickEvents处理
    } else {
      // 这是一个书签
      const bookmark = document.createElement('div');
      bookmark.className = 'bookmark-item ripple';
      bookmark.title = `${node.title}\n${node.url}`; // Add tooltip with URL
      // 存储书签ID
      bookmark.dataset.id = node.id;

      const bookmarkIcon = document.createElement('img'); // Use img tag for favicons
      bookmarkIcon.className = 'bookmark-icon';
      // Use Chrome's favicon service
      const faviconUrl = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(node.url)}&size=16`;
      bookmarkIcon.src = faviconUrl;
      bookmarkIcon.onerror = function() { // Fallback icon
          this.src = 'images/default_favicon.svg'; // Use SVG fallback
          this.onerror = null; // Prevent infinite loop if default also fails
      };

      const bookmarkTitle = document.createElement('span');
      bookmarkTitle.className = 'bookmark-title';
      bookmarkTitle.textContent = node.title || node.url; // Show URL if title is empty

      bookmark.appendChild(bookmarkIcon);
      bookmark.appendChild(bookmarkTitle);

      // 添加点击事件以在新标签页中打开书签
      bookmark.addEventListener('click', function() {
        // 在新标签页中打开链接
        chrome.tabs.create({ url: node.url });
      });

      container.appendChild(bookmark);
    }
  });
}

// 编辑书签或文件夹 - 优化版本
function useBookmarkManagerPrivate(bookmarkId) {
  // 获取书签信息
  chrome.bookmarks.get(bookmarkId, function(bookmarks) {
    if (bookmarks && bookmarks.length > 0) {
      const bookmark = bookmarks[0];
      const isFolder = !bookmark.url;
      
      // 移除任何已存在的编辑对话框
      const existingDialog = document.querySelector('.edit-dialog-backdrop');
      if (existingDialog) {
        existingDialog.remove();
      }
      
      // 创建对话框背景
      const backdrop = document.createElement('div');
      backdrop.className = 'edit-dialog-backdrop';
      
      // 创建对话框容器
      const dialog = document.createElement('div');
      dialog.className = 'edit-dialog';
      dialog.setAttribute('role', 'dialog'); // 添加ARIA角色
      dialog.setAttribute('aria-labelledby', 'edit-dialog-title'); // 关联标题
      
      // 创建标题
      const title = document.createElement('div');
      title.className = 'edit-dialog-title';
      title.id = 'edit-dialog-title'; // 为ARIA标记提供ID
      title.textContent = isFolder ? '编辑文件夹' : '编辑书签';
      dialog.appendChild(title);
      
      // 创建表单
      const form = document.createElement('div');
      form.className = 'edit-dialog-form';
      form.setAttribute('role', 'form'); // 添加ARIA角色
      
      // 名称字段
      const nameLabel = document.createElement('label');
      nameLabel.textContent = '名称:';
      nameLabel.htmlFor = 'edit-name-input';
      
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.id = 'edit-name-input';
      nameInput.className = 'edit-dialog-input';
      nameInput.value = bookmark.title;
      nameInput.required = true; // 添加验证
      nameInput.setAttribute('aria-required', 'true'); // ARIA标记为必填字段
      
      form.appendChild(nameLabel);
      form.appendChild(nameInput);
      
      // 如果是书签而非文件夹，添加URL字段
      let urlInput = null;
      if (!isFolder) {
        const urlLabel = document.createElement('label');
        urlLabel.textContent = 'URL:';
        urlLabel.htmlFor = 'edit-url-input';
        
        urlInput = document.createElement('input');
        urlInput.type = 'url'; // 使用url类型增强验证
        urlInput.id = 'edit-url-input';
        urlInput.className = 'edit-dialog-input';
        urlInput.value = bookmark.url;
        urlInput.required = true; // 添加验证
        urlInput.setAttribute('aria-required', 'true'); // ARIA标记为必填字段
        urlInput.pattern = 'https?://.+'; // 简单URL模式验证
        
        form.appendChild(urlLabel);
        form.appendChild(urlInput);
      }
      
      dialog.appendChild(form);
      
      // 创建按钮容器
      const buttons = document.createElement('div');
      buttons.className = 'edit-dialog-buttons';
      
      // 取消按钮
      const cancelButton = document.createElement('button');
      cancelButton.textContent = '取消';
      cancelButton.className = 'edit-dialog-button cancel-button ripple';
      cancelButton.setAttribute('type', 'button');
      cancelButton.addEventListener('click', function(e) {
        e.stopPropagation();
        backdrop.remove();
      });
      
      // 确认按钮
      const confirmButton = document.createElement('button');
      confirmButton.textContent = '保存';
      confirmButton.className = 'edit-dialog-button confirm-button ripple';
      confirmButton.setAttribute('type', 'button');
      
      // 表单验证和提交处理
      confirmButton.addEventListener('click', function(e) {
        e.stopPropagation();
        
        // 简单表单验证
        let isValid = true;
        let focusElement = null;
        
        const newTitle = nameInput.value.trim();
        if (!newTitle) {
          nameInput.style.borderColor = '#e53935'; // 错误状态边框
          isValid = false;
          focusElement = nameInput;
        } else {
          nameInput.style.borderColor = '';
        }
        
        let newUrl = '';
        if (!isFolder && urlInput) {
          newUrl = urlInput.value.trim();
          if (!newUrl || !newUrl.match(/^https?:\/\/.+/)) {
            urlInput.style.borderColor = '#e53935'; // 错误状态边框
            isValid = false;
            if (!focusElement) focusElement = urlInput;
          } else {
            urlInput.style.borderColor = '';
          }
        }
        
        if (!isValid) {
          if (focusElement) focusElement.focus();
          return;
        }
        
        // 准备更新数据
        const updateData = { title: newTitle };
        if (!isFolder && newUrl) {
          updateData.url = newUrl;
        }
        
        // 更新书签
        chrome.bookmarks.update(bookmarkId, updateData, function() {
          // 更新DOM
          if (isFolder) {
            // 更新文件夹名称
            const folderElement = document.querySelector(`.bookmark-folder[data-id="${bookmarkId}"]`);
            if (folderElement) {
              const nameElement = folderElement.querySelector('.folder-name');
              if (nameElement) {
                nameElement.textContent = newTitle;
              }
            }
          } else {
            // 更新书签名称和URL
            const bookmarkElement = document.querySelector(`.bookmark-item[data-id="${bookmarkId}"]`);
            if (bookmarkElement) {
              const titleElement = bookmarkElement.querySelector('.bookmark-title');
              if (titleElement) {
                titleElement.textContent = newTitle;
              }
              
              // 更新提示文本
              bookmarkElement.title = `${newTitle}\n${newUrl}`;
              
              // 如果URL改变，更新favicon
              if (newUrl && newUrl !== bookmark.url) {
                const iconElement = bookmarkElement.querySelector('.bookmark-icon');
                if (iconElement) {
                  const faviconUrl = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(newUrl)}&size=16`;
                  iconElement.src = faviconUrl;
                  // 添加错误处理
                  iconElement.onerror = function() {
                    this.src = 'images/default_favicon.svg';
                    this.onerror = null;
                  };
                }
              }
            }
          }
          
          backdrop.remove();
        });
      });
      
      // 设置按钮顺序：先确认后取消，符合Chrome风格
      buttons.appendChild(confirmButton);
      buttons.appendChild(cancelButton); 
      dialog.appendChild(buttons);
      
      backdrop.appendChild(dialog);
      document.body.appendChild(backdrop);
      
      // 键盘导航支持
      dialog.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          backdrop.remove();
        } else if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') {
          // 阻止Enter键的默认行为，防止点击第一个按钮
          e.preventDefault();
          // 手动触发确认按钮点击
          confirmButton.click();
        }
      });
      
      // 聚焦到名称输入框
      nameInput.focus();
      nameInput.select();
      
      // 阻止对话框背景的点击事件冒泡
      backdrop.addEventListener('click', function(e) {
        if (e.target === backdrop) {
          backdrop.remove();
        }
      });
    }
  });
}

// 显示删除确认对话框 - 优化版本
function showDeleteConfirmDialog(itemId, isFolder, element) {
  // 移除任何已存在的对话框
  const existingDialog = document.querySelector('.edit-dialog-backdrop');
  if (existingDialog) {
    existingDialog.remove();
  }
  
  // 获取项目信息以显示名称
  chrome.bookmarks.get(itemId, function(items) {
    if (!items || !items.length) return;
    
    const item = items[0];
    const itemName = item.title || (isFolder ? '未命名文件夹' : '未命名书签');
    
    // 创建对话框背景
    const backdrop = document.createElement('div');
    backdrop.className = 'edit-dialog-backdrop';
    
    // 创建对话框容器
    const dialog = document.createElement('div');
    dialog.className = 'edit-dialog';
    dialog.setAttribute('role', 'alertdialog'); // 添加ARIA角色
    
    // 创建标题
    const title = document.createElement('div');
    title.className = 'edit-dialog-title';
    title.textContent = '确认删除';
    dialog.appendChild(title);
    
    // 创建消息
    const message = document.createElement('div');
    message.className = 'delete-dialog-message';
    message.textContent = isFolder 
      ? `确定要删除文件夹"${itemName}"及其所有内容吗？` 
      : `确定要删除书签"${itemName}"吗？`;
    dialog.appendChild(message);
    
    // 创建按钮容器
    const buttons = document.createElement('div');
    buttons.className = 'edit-dialog-buttons';
    
    // 取消按钮
    const cancelButton = document.createElement('button');
    cancelButton.textContent = '取消';
    cancelButton.className = 'edit-dialog-button cancel-button ripple';
    cancelButton.addEventListener('click', function(e) {
      e.stopPropagation();
      backdrop.remove();
    });
    
    // 确认按钮
    const confirmButton = document.createElement('button');
    confirmButton.textContent = '删除';
    confirmButton.className = 'edit-dialog-button delete-confirm-button ripple';
    confirmButton.addEventListener('click', function(e) {
      e.stopPropagation();
      
      // 添加删除中状态
      confirmButton.disabled = true;
      confirmButton.textContent = '删除中...';
      
      if (isFolder) {
        chrome.bookmarks.removeTree(itemId, function() {
          // 删除成功后移除DOM元素
          if (element && element.remove) {
            element.remove();
          }
          backdrop.remove();
        });
      } else {
        chrome.bookmarks.remove(itemId, function() {
          // 删除成功后移除DOM元素
          if (element && element.remove) {
            element.remove();
          }
          backdrop.remove();
        });
      }
    });
    
    buttons.appendChild(confirmButton);
    buttons.appendChild(cancelButton);
    dialog.appendChild(buttons);
    
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);
    
    // 键盘导航支持
    dialog.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        backdrop.remove();
      } else if (e.key === 'Enter') {
        confirmButton.click();
      }
    });
    
    // 聚焦到确认按钮
    confirmButton.focus();
    
    // 点击背景关闭对话框
    backdrop.addEventListener('click', function(e) {
      if (e.target === backdrop) {
        backdrop.remove();
      }
    });
  });
}