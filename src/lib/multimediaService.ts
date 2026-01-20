// Multimedia service for social media-like posts
import { supabase } from './supabaseClient';

export interface MultimediaPost {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  title?: string;
  content: string;
  media_type: 'image' | 'video' | 'text' | 'meme';
  media_url?: string;
  tags: string[];
  likes_count: number;
  comments_count: number;
  is_active: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface MultimediaComment {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  comment_text: string;
  is_active: boolean;
  created_at: string;
}

// CREATE NEW POST (like Facebook post)
export const createMultimediaPost = async (postData: {
  user_name: string;
  user_role: string;
  title?: string;
  content: string;
  media_type: 'image' | 'video' | 'text' | 'meme';
  media_url?: string;
  tags?: string[];
}): Promise<MultimediaPost | null> => {
  try {
    console.log('🎬 Creating multimedia post...', postData);

    const { data, error } = await supabase
      .from('multimedia_posts')
      .insert([{
        user_id: '00000000-0000-0000-0000-000000000000', // Default user ID
        user_name: postData.user_name,
        user_role: postData.user_role,
        title: postData.title || '',
        content: postData.content,
        media_type: postData.media_type,
        media_url: postData.media_url || null,
        tags: postData.tags || [],
        likes_count: 0,
        comments_count: 0,
        is_active: true,
        is_approved: true
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating post:', error);
      return null;
    }

    console.log('✅ Post created successfully!', data);
    return data as MultimediaPost;
  } catch (error) {
    console.error('❌ Error in createMultimediaPost:', error);
    return null;
  }
};

// GET ALL POSTS (like Facebook feed)
export const getAllMultimediaPosts = async (): Promise<MultimediaPost[]> => {
  try {
    console.log('📱 Loading multimedia feed...');

    const { data, error } = await supabase
      .from('multimedia_posts')
      .select('*')
      .eq('is_active', true)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error loading posts:', error);
      return [];
    }

    console.log('✅ Loaded posts:', data?.length || 0);
    return data as MultimediaPost[];
  } catch (error) {
    console.error('❌ Error in getAllMultimediaPosts:', error);
    return [];
  }
};

// UPLOAD MEDIA (images, videos)
export const uploadMultimediaFile = async (file: File): Promise<string | null> => {
  try {
    console.log('📸 Uploading multimedia file...', file.name);

    const fileExt = file.name.split('.').pop();
    const fileName = `multimedia-${Date.now()}.${fileExt}`;
    const filePath = `multimedia/${fileName}`;

    // Try uploading to Supabase storage
    const { data, error } = await supabase.storage
      .from('multimedia-files')
      .upload(filePath, file);

    if (error) {
      console.log('⚠️ Storage upload failed, using base64 fallback:', error);
      
      // Fallback to base64
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    }

    if (data) {
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('multimedia-files')
        .getPublicUrl(filePath);

      console.log('✅ Media uploaded to storage:', publicUrl);
      return publicUrl;
    }

    return null;
  } catch (error) {
    console.error('❌ Error uploading media:', error);
    
    // Fallback to base64
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }
};

// LIKE A POST
export const likePost = async (postId: string, userId: string): Promise<boolean> => {
  try {
    console.log('👍 Liking post...', postId);

    // Check if user already liked this post
    const { data: existingLikes } = await supabase
      .from('multimedia_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (existingLikes && existingLikes.length > 0) {
      console.log('⚠️ User already liked this post');
      return true; // Already liked, no need to do anything
    }

    // Add like (simple insert since we checked for duplicates)
    const { error: likeError } = await supabase
      .from('multimedia_likes')
      .insert([{
        post_id: postId,
        user_id: userId
      }]);

    if (likeError) {
      console.error('❌ Error liking post:', likeError);
      return false;
    }

    // Count total likes for this post
    const { data: likesData, error: countError } = await supabase
      .from('multimedia_likes')
      .select('id')
      .eq('post_id', postId);

    if (countError) {
      console.error('❌ Error counting likes:', countError);
      return false;
    }

    const likesCount = likesData?.length || 0;

    // Update the post's likes count
    const { error: updateError } = await supabase
      .from('multimedia_posts')
      .update({ likes_count: likesCount })
      .eq('id', postId);

    if (updateError) {
      console.error('❌ Error updating likes count:', updateError);
      return false;
    }

    console.log('✅ Post liked successfully! Total likes:', likesCount);
    return true;
  } catch (error) {
    console.error('❌ Error in likePost:', error);
    return false;
  }
};

// ADD COMMENT
export const addComment = async (postId: string, userId: string, userName: string, commentText: string): Promise<MultimediaComment | null> => {
  try {
    console.log('💬 Adding comment...', postId);

    // Insert comment
    const { data, error } = await supabase
      .from('multimedia_comments')
      .insert({
        post_id: postId,
        user_id: userId,
        user_name: userName,
        comment_text: commentText,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error adding comment:', error);
      return null;
    }

    console.log('✅ Comment inserted:', data);

    // Count total comments for this post
    const { data: commentsData, error: countError } = await supabase
      .from('multimedia_comments')
      .select('id')
      .eq('post_id', postId)
      .eq('is_active', true);

    if (countError) {
      console.error('❌ Error counting comments:', countError);
    } else {
      const commentsCount = commentsData?.length || 0;
      console.log('💬 Total comments for post:', commentsCount);

      // Update the post's comments count
      const { error: updateError } = await supabase
        .from('multimedia_posts')
        .update({ comments_count: commentsCount })
        .eq('id', postId);

      if (updateError) {
        console.error('❌ Error updating comments count:', updateError);
      } else {
        console.log('✅ Comments count updated:', commentsCount);
      }
    }

    console.log('✅ Comment added successfully!');
    return data as MultimediaComment;
  } catch (error) {
    console.error('❌ Error in addComment:', error);
    return null;
  }
};

// GET COMMENTS FOR POST
export const getPostComments = async (postId: string): Promise<MultimediaComment[]> => {
  try {
    const { data, error } = await supabase
      .from('multimedia_comments')
      .select('*')
      .eq('post_id', postId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Error loading comments:', error);
      return [];
    }

    return data as MultimediaComment[];
  } catch (error) {
    console.error('❌ Error in getPostComments:', error);
    return [];
  }
};